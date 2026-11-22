using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Infrastructure.Finance.Seed;

/// <summary>Extra demo accounts that fill the admin area with different plans, activity levels and states.</summary>
public static class DemoUsers
{
    public sealed record Profile(
        string Email,
        string FirstName,
        string LastName,
        string PlanCode,
        int RegisteredDaysAgo,
        int Months,
        decimal Salary,
        bool IsBlocked,
        int RandomSeed);

    public static readonly Profile[] All =
    [
        new("olena.kovalchuk@sable.ua", "Олена", "Ковальчук", "plus", 95, 3, 38_000m, false, 11),
        new("andriy.melnyk@sable.ua", "Андрій", "Мельник", "start", 40, 2, 27_000m, false, 22),
        new("anastasiia.kravchenko@sable.ua", "Анастасія-Вікторія", "Кравченко-Левицька", "plus", 20, 1, 52_000m, false, 33),
        new("maksym.lytvynenko@sable.ua", "Максим", "Литвиненко", "start", 60, 2, 21_000m, true, 44),
        new("iryna.bondarenko@sable.ua", "Ірина", "Бондаренко", "start", 2, 0, 0m, false, 55)
    ];

    private const string Groceries = "Продукти";
    private const string Transport = "Транспорт";
    private const string Cafes = "Кафе й ресторани";
    private const string Entertainment = "Розваги";
    private const string Phone = "Зв’язок";
    private const string Housing = "Житло";
    private const string Contribution = "Внесок у ціль";
    private const string Salary = "Зарплата";

    public static readonly string[] RequiredCategories =
        [Groceries, Transport, Cafes, Entertainment, Phone, Housing, Contribution, Salary];

    private static readonly string[] Stores = ["Сільпо", "АТБ", "Варус", "Novus"];

    /// <summary>Builds one or two accounts with <see cref="Profile.Months"/> months of transactions; empty for a profile with no months.</summary>
    public static DemoDataSet Generate(
        Profile profile,
        Guid userId,
        DateOnly today,
        IReadOnlyDictionary<string, Guid> categories)
    {
        if (profile.Months == 0)
        {
            return new DemoDataSet([], [], [], []);
        }

        var random = new Random(profile.RandomSeed);
        var currentMonth = new DateOnly(today.Year, today.Month, 1);
        var firstMonth = currentMonth.AddMonths(1 - profile.Months);
        var opened = new DateTimeOffset(firstMonth.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var sequence = 0;

        var card = NewAccount("Основна картка", AccountType.Card, Math.Round(profile.Salary * 0.4m), true, opened);
        var accounts = new List<Account> { card };
        Account? savings = null;
        if (profile.PlanCode == "plus")
        {
            savings = NewAccount("Заощадження", AccountType.Savings, Math.Round(profile.Salary * 1.5m), false, opened.AddMinutes(1));
            accounts.Add(savings);
        }

        var transactions = new List<Transaction>();

        void Add(DateOnly date, TransactionType type, decimal amount, string description, string category, Account account, Goal? goal = null)
        {
            if (date > today || date < firstMonth)
            {
                return;
            }

            transactions.Add(new Transaction
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                AccountId = account.Id,
                CategoryId = categories[category],
                GoalId = goal?.Id,
                Type = type,
                Amount = amount,
                OccurredOn = date,
                Description = description,
                CreatedAt = new DateTimeOffset(date.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero).AddSeconds(sequence++)
            });
        }

        decimal Money(double min, double max) => Math.Round((decimal)(min + random.NextDouble() * (max - min)), 2);

        var goals = new List<Goal>();
        Goal? goal = null;
        if (savings is not null)
        {
            goal = new Goal
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                Name = "Поїздка до моря",
                TargetAmount = Math.Round(profile.Salary * 1.2m),
                Deadline = today.AddMonths(6),
                Icon = "pin",
                Color = "#6FDBD4",
                CreatedAt = opened
            };
            goals.Add(goal);
        }

        for (var m = 0; m < profile.Months; m++)
        {
            var month = firstMonth.AddMonths(m);
            var days = DateTime.DaysInMonth(month.Year, month.Month);
            DateOnly Day(int day) => new(month.Year, month.Month, Math.Min(day, days));

            Add(Day(5), TransactionType.Income, profile.Salary, "Зарплата", Salary, card);
            Add(Day(7), TransactionType.Expense, Math.Round(profile.Salary * 0.3m / 100m) * 100m, "Оренда житла", Housing, card);
            Add(Day(9), TransactionType.Expense, 250m, "Мобільний зв’язок", Phone, card);

            for (var d = 1; d <= days; d++)
            {
                var date = Day(d);
                if (random.NextDouble() < 0.35)
                {
                    Add(date, TransactionType.Expense, Money(90, 700), Stores[random.Next(Stores.Length)], Groceries, card);
                }

                if (random.NextDouble() < 0.15)
                {
                    Add(date, TransactionType.Expense, Money(30, 260), "Таксі", Transport, card);
                }

                if (random.NextDouble() < 0.12)
                {
                    Add(date, TransactionType.Expense, Money(120, 520), "Кав’ярня", Cafes, card);
                }
            }

            if (random.NextDouble() < 0.6)
            {
                Add(Day(random.Next(12, 26)), TransactionType.Expense, Money(200, 600), "Концерт", Entertainment, card);
            }

            if (goal is not null)
            {
                Add(Day(6), TransactionType.Expense, Math.Round(profile.Salary * 0.1m), "Внесок: " + goal.Name, Contribution, card, goal);
            }
        }

        var budgets = new List<Budget>
        {
            new() { Id = Guid.CreateVersion7(), UserId = userId, CategoryId = categories[Groceries], LimitAmount = Math.Round(profile.Salary * 0.2m / 100m) * 100m, CreatedAt = opened },
            new() { Id = Guid.CreateVersion7(), UserId = userId, CategoryId = categories[Cafes], LimitAmount = 2_000m, CreatedAt = opened }
        };

        return new DemoDataSet(accounts, transactions, budgets, goals);

        Account NewAccount(string name, AccountType type, decimal initial, bool isDefault, DateTimeOffset created) => new()
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            Name = name,
            Type = type,
            InitialBalance = initial,
            IsDefault = isDefault,
            CreatedAt = created
        };
    }
}
