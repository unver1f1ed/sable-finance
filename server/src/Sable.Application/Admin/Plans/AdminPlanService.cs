using Microsoft.EntityFrameworkCore;
using Sable.Application.Abstractions;
using Sable.Application.Admin.Users;
using Sable.Application.Common;
using Sable.Application.Content;
using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Application.Admin.Plans;

public class AdminPlanService(IFinanceDbContext db, IUserAdminService users) : IAdminPlanService
{
    private const string StartMustStayPublishedMessage = "Тариф Старт не можна зняти з публікації";
    private const int MaxFeatureTextLength = 40;

    public async Task<IReadOnlyList<AdminPlanDto>> ListPlansAsync(CancellationToken cancellationToken = default)
    {
        var plans = await db.Plans.OrderBy(p => p.SortOrder).ThenBy(p => p.Id).ToListAsync(cancellationToken);
        var counts = await users.CountUsersByPlanAsync(cancellationToken);

        return plans.Select(p => ToDto(p, counts.GetValueOrDefault(p.Code))).ToList();
    }

    public async Task<AdminPlanDto> UpdatePlanAsync(
        Guid id,
        AdminPlanInput input,
        CancellationToken cancellationToken = default)
    {
        var plan = await db.Plans.FirstOrDefaultAsync(p => p.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        if (input.PriceYearlyPerMonth > input.PriceMonthly)
        {
            throw Errors.Validation("priceYearlyPerMonth", ValidationMessages.YearlyAboveMonthly);
        }

        if (plan.Code == PlanCodes.Start && !input.IsPublished)
        {
            throw Errors.Conflict(StartMustStayPublishedMessage);
        }

        plan.Name = input.Name.Trim();
        plan.Description = input.Description.Trim();
        plan.PriceMonthly = input.PriceMonthly;
        plan.PriceYearlyPerMonth = input.PriceYearlyPerMonth;
        plan.IsPopular = input.IsPopular;
        plan.IsPublished = input.IsPublished;
        await db.SaveChangesAsync(cancellationToken);

        var counts = await users.CountUsersByPlanAsync(cancellationToken);
        return ToDto(plan, counts.GetValueOrDefault(plan.Code));
    }

    public async Task<IReadOnlyList<AdminFeatureDto>> ListFeaturesAsync(CancellationToken cancellationToken = default)
    {
        var plans = await db.Plans.OrderBy(p => p.SortOrder).Select(p => new { p.Id, p.Code })
            .ToListAsync(cancellationToken);
        var features = await db.PlanFeatures
            .Include(f => f.Values)
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Id)
            .ToListAsync(cancellationToken);

        return features
            .Select(f => ToDto(f, plans.ToDictionary(p => p.Id, p => p.Code)))
            .ToList();
    }

    public async Task<AdminFeatureDto> CreateFeatureAsync(
        AdminFeatureInput input,
        CancellationToken cancellationToken = default)
    {
        var plans = await db.Plans.ToListAsync(cancellationToken);
        ValidateValues(input, plans);

        var last = await db.PlanFeatures.MaxAsync(f => (int?)f.SortOrder, cancellationToken) ?? 0;
        var feature = new PlanFeature
        {
            Id = Guid.CreateVersion7(),
            Name = input.Name.Trim(),
            SortOrder = last + 1
        };
        foreach (var plan in plans)
        {
            feature.Values.Add(BuildValue(feature.Id, plan, input));
        }

        db.PlanFeatures.Add(feature);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(feature, plans.ToDictionary(p => p.Id, p => p.Code));
    }

    public async Task<AdminFeatureDto> UpdateFeatureAsync(
        Guid id,
        AdminFeatureInput input,
        CancellationToken cancellationToken = default)
    {
        var feature = await db.PlanFeatures.Include(f => f.Values)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw Errors.NotFound();
        var plans = await db.Plans.ToListAsync(cancellationToken);
        ValidateValues(input, plans);

        feature.Name = input.Name.Trim();
        foreach (var plan in plans)
        {
            var fresh = BuildValue(feature.Id, plan, input);
            var existing = feature.Values.FirstOrDefault(v => v.PlanId == plan.Id);
            if (existing is null)
            {
                feature.Values.Add(fresh);
            }
            else
            {
                existing.Kind = fresh.Kind;
                existing.Text = fresh.Text;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToDto(feature, plans.ToDictionary(p => p.Id, p => p.Code));
    }

    public async Task DeleteFeatureAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var feature = await db.PlanFeatures.FirstOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw Errors.NotFound();

        db.PlanFeatures.Remove(feature);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task ReorderFeaturesAsync(FeatureOrderInput input, CancellationToken cancellationToken = default)
    {
        var features = await db.PlanFeatures.ToListAsync(cancellationToken);

        var expected = features.Select(f => f.Id).ToHashSet();
        if (input.Ids.Count != expected.Count || !expected.SetEquals(input.Ids))
        {
            throw Errors.Validation("ids", ValidationMessages.FeatureOrderIncomplete);
        }

        var order = 1;
        foreach (var featureId in input.Ids)
        {
            features.First(f => f.Id == featureId).SortOrder = order++;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateValues(AdminFeatureInput input, List<Plan> plans)
    {
        var codes = plans.Select(p => p.Code).ToHashSet();

        foreach (var (code, value) in input.Values)
        {
            if (!codes.Contains(code))
            {
                throw Errors.Validation("values", ValidationMessages.UnknownPlanCode);
            }

            if (!Enum.IsDefined(value.Kind))
            {
                throw Errors.Validation("values", ValidationMessages.ChooseFromList);
            }

            if (value.Kind == FeatureKind.Text)
            {
                var text = value.Text?.Trim();
                if (string.IsNullOrEmpty(text))
                {
                    throw Errors.Validation("values", ValidationMessages.FeatureTextRequired);
                }

                if (text.Length > MaxFeatureTextLength)
                {
                    throw Errors.Validation("values", ValidationMessages.MaxLength40);
                }
            }
        }
    }

    private static PlanFeatureValue BuildValue(Guid featureId, Plan plan, AdminFeatureInput input)
    {
        if (!input.Values.TryGetValue(plan.Code, out var value))
        {
            return new PlanFeatureValue { PlanId = plan.Id, FeatureId = featureId, Kind = FeatureKind.NotIncluded };
        }

        return new PlanFeatureValue
        {
            PlanId = plan.Id,
            FeatureId = featureId,
            Kind = value.Kind,
            Text = value.Kind == FeatureKind.Text ? value.Text!.Trim() : null
        };
    }

    private static AdminFeatureDto ToDto(PlanFeature feature, Dictionary<Guid, string> codesById) => new()
    {
        Id = feature.Id,
        Name = feature.Name,
        SortOrder = feature.SortOrder,
        Values = codesById.ToDictionary(
            pair => pair.Value,
            pair =>
            {
                var value = feature.Values.FirstOrDefault(v => v.PlanId == pair.Key);
                return value is null
                    ? new FeatureValueDto(FeatureKind.NotIncluded, null)
                    : new FeatureValueDto(value.Kind, value.Text);
            })
    };

    private static AdminPlanDto ToDto(Plan plan, int userCount) => new()
    {
        Id = plan.Id,
        Code = plan.Code,
        Name = plan.Name,
        Description = plan.Description,
        PriceMonthly = plan.PriceMonthly,
        PriceYearlyPerMonth = plan.PriceYearlyPerMonth,
        IsPopular = plan.IsPopular,
        IsPublished = plan.IsPublished,
        SortOrder = plan.SortOrder,
        UserCount = userCount
    };
}
