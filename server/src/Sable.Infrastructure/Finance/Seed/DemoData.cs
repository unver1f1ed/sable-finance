using Sable.Domain.Entities;
using Sable.Domain.Enums;

namespace Sable.Infrastructure.Finance.Seed;

public sealed record DemoDataSet(
    List<Account> Accounts,
    List<Transaction> Transactions,
    List<Budget> Budgets,
    List<Goal> Goals);

/// <summary>Deterministic demo data for the last six months. Dates are relative to <c>today</c>, nothing lies in the future.</summary>
public static class DemoData
{
    public const string Email = "demo@sable.ua";
    public const string FirstName = "Богдан";
    public const string LastName = "Паславський";

    private const int Months = 6;
    private const int RandomSeed = 20261113;

    private const string Groceries = "Продукти";
    private const string Transport = "Транспорт";
    private const string Cafes = "Кафе й ресторани";
    private const string Health = "Здоров’я";
    private const string Entertainment = "Розваги";
    private const string Phone = "Зв’язок";
    private const string Utilities = "Комунальні";
    private const string Housing = "Житло";
    private const string Contribution = "Внесок у ціль";
    private const string Salary = "Зарплата";
    private const string SideIncome = "Підробіток";
    private const string Gifts = "Подарунки";

    public static readonly string[] RequiredCategories =
        [Groceries, Transport, Cafes, Health, Entertainment, Phone, Utilities, Housing, Contribution, Salary, SideIncome, Gifts];

    private static readonly string[] GroceryStores = ["Сільпо", "АТБ", "Novus"];
    private static readonly string[] CafeNames = ["Aroma Kava", "Львівська кава", "Pizza Day", "Кав’ярня на розі"];

    public static DemoDataSet Generate(
        Guid userId,
        DateOnly today,
        DateTimeOffset now,
        IReadOnlyDictionary<string, Guid> categories)
    {
        var random = new Random(RandomSeed);
        var currentMonth = new DateOnly(today.Year, today.Month, 1);
        var firstMonth = currentMonth.AddMonths(1 - Months);
        var sequence = 0;

        var opened = new DateTimeOffset(firstMonth.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var card = NewAccount("Картка Monobank", AccountType.Card, 20_000m, true, opened);
        var cash = NewAccount("Готівка", AccountType.Cash, 2_500m, false, opened.AddMinutes(1));
        var savings = NewAccount("Заощадження", AccountType.Savings, 60_000m, false, opened.AddMinutes(2));

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
        decimal Round100(double min, double max) => Math.Round((decimal)(min + random.NextDouble() * (max - min)) / 100m) * 100m;

        for (var m = 0; m < Months; m++)
        {
            var month = firstMonth.AddMonths(m);
            var days = DateTime.DaysInMonth(month.Year, month.Month);
            DateOnly Day(int day) => new(month.Year, month.Month, Math.Min(day, days));

            Add(Day(10), TransactionType.Income, 46_000m, "Зарплата, ТОВ «Софтлайн»", Salary, card);
            if (random.NextDouble() < 0.5)
            {
                Add(Day(random.Next(14, 27)), TransactionType.Income, Round100(1_500, 6_000), "Підробіток: фріланс-проєкт", SideIncome, card);
            }

            if (m is 1 or 3)
            {
                Add(Day(8), TransactionType.Income, 2_000m, "Подарунок від родини", Gifts, cash);
            }

            Add(Day(3), TransactionType.Expense, 14_000m, "Оренда квартири", Housing, card);
            Add(Day(15), TransactionType.Expense, Money(2_000, 2_600), "Комунальні послуги", Utilities, card);
            Add(Day(16), TransactionType.Expense, Money(350, 550), "Електроенергія", Utilities, card);
            Add(Day(5), TransactionType.Expense, 275m, "Київстар", Phone, card);
            Add(Day(20), TransactionType.Expense, 249m, "Netflix", Entertainment, card);
            if (random.NextDouble() < 0.5)
            {
                Add(Day(random.Next(1, 29)), TransactionType.Expense, Round100(240, 520), "Кіно", Entertainment, card);
            }

            if (random.NextDouble() < 0.5)
            {
                Add(Day(random.Next(1, 29)), TransactionType.Expense, Money(150, 900), "Аптека Подорожник", Health, card);
            }

            for (var d = 1; d <= days; d++)
            {
                var date = Day(d);
                if (random.NextDouble() < 0.5)
                {
                    var account = random.NextDouble() < 0.85 ? card : cash;
                    Add(date, TransactionType.Expense, Money(80, 900), GroceryStores[random.Next(GroceryStores.Length)], Groceries, account);
                }

                if (random.NextDouble() < 0.2)
                {
                    Add(date, TransactionType.Expense, Round100(90, 320), "Bolt", Transport, card);
                }

                if (random.NextDouble() < 0.2)
                {
                    Add(date, TransactionType.Expense, 20m, "Метро", Transport, card);
                }

                if (random.NextDouble() < 0.25)
                {
                    Add(date, TransactionType.Expense, Money(90, 650), CafeNames[random.Next(CafeNames.Length)], Cafes, card);
                }
            }
        }

        EnsureCafesOverLimit(transactions, currentMonth, today, categories[Cafes], (date, amount, description) =>
            Add(date, TransactionType.Expense, amount, description, Cafes, card));

        var goals = new List<Goal>();
        Goal NewGoal(string name, decimal target, DateOnly? deadline, string icon, string color, DateTimeOffset createdAt)
        {
            var goal = new Goal
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                Name = name,
                TargetAmount = target,
                Deadline = deadline,
                Icon = icon,
                Color = color,
                CreatedAt = createdAt
            };
            goals.Add(goal);
            return goal;
        }

        DateOnly ClampToToday(DateOnly monthStart, int day) =>
            new[] { new DateOnly(monthStart.Year, monthStart.Month, Math.Min(day, DateTime.DaysInMonth(monthStart.Year, monthStart.Month))), today }.Min();

        void Contribute(Goal goal, int monthIndex, int day, decimal amount, Account from) =>
            Add(ClampToToday(firstMonth.AddMonths(monthIndex), day), TransactionType.Expense, amount, "Внесок: " + goal.Name, Contribution, from, goal);

        var vacation = NewGoal("Відпустка в Карпатах", 45_000m, today.AddMonths(5), "pin", "#6FDBD4", now.AddMonths(-5));
        var cushion = NewGoal("Фінансова подушка", 150_000m, null, "shield", "#A78BFA", now.AddMonths(-5));
        var laptop = NewGoal("Новий ноутбук", 38_000m, null, "card", "#60A5FA", now.AddMonths(-5));
        var gift = NewGoal("Подарунок мамі", 8_000m, null, "gift", "#F472B6", now.AddMonths(-4));
        gift.ArchivedAt = now.AddDays(-30);

        for (var m = 0; m < Months; m++)
        {
            Contribute(vacation, m, 11, 4_500m, card);
            Contribute(cushion, m, 14, m == Months - 1 ? 12_000m : 10_000m, card);
        }

        for (var m = 0; m < 4; m++)
        {
            Contribute(laptop, m, 5, 9_500m, savings);
        }

        Contribute(gift, 1, 20, 1_500m, card);
        Contribute(gift, 2, 20, 1_500m, card);

        var budgets = new List<Budget>();
        void AddBudget(string category, decimal limit) => budgets.Add(new Budget
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            CategoryId = categories[category],
            LimitAmount = limit,
            CreatedAt = now.AddMonths(-5)
        });

        AddBudget(Groceries, 9_000m);
        AddBudget(Cafes, 3_000m);
        AddBudget(Transport, 3_500m);
        AddBudget(Entertainment, 2_000m);
        AddBudget(Utilities, 3_500m);

        return new DemoDataSet([card, cash, savings], transactions, budgets, goals);

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

    /// <summary>Makes the café spending of the current month exceed its 3 000 limit slightly so the over-limit state is visible.</summary>
    private static void EnsureCafesOverLimit(
        List<Transaction> transactions,
        DateOnly currentMonth,
        DateOnly today,
        Guid cafeCategoryId,
        Action<DateOnly, decimal, string> add)
    {
        const decimal limit = 3_000m;
        const decimal excess = 140.30m;

        var spent = transactions
            .Where(t => t.CategoryId == cafeCategoryId && t.OccurredOn >= currentMonth)
            .Sum(t => t.Amount);
        if (spent > limit)
        {
            return;
        }

        var deficit = limit - spent + excess;
        var parts = (int)Math.Clamp(Math.Ceiling(deficit / 700m), 1, 12);
        var share = Math.Round(deficit / parts, 2);
        var availableDays = today.Day;

        for (var i = 0; i < parts; i++)
        {
            var amount = i == parts - 1 ? deficit - share * (parts - 1) : share;
            add(currentMonth.AddDays(i % availableDays), amount, "Ресторан «Канапа»");
        }
    }
}
