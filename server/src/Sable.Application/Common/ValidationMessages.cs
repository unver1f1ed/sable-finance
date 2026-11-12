namespace Sable.Application.Common;

public static class ValidationMessages
{
    public const string Required = "Поле обов’язкове";
    public const string InvalidEmail = "Вкажіть коректну адресу пошти";
    public const string EmailTooLong = "Адреса пошти має містити не більше 120 символів";
    public const string NameLength = "Значення має містити від 1 до 60 символів";
    public const string InvalidValue = "Некоректне значення";
    public const string ChooseFromList = "Оберіть значення зі списку";

    public const string MaxLength40 = "Не більше 40 символів";
    public const string MaxLength60 = "Не більше 60 символів";
    public const string MaxLength120 = "Не більше 120 символів";
    public const string MaxLength300 = "Не більше 300 символів";
    public const string TooManyDecimals = "Не більше двох знаків після коми";

    public const string BalanceRange = "Сума має бути в межах від −1 000 000 000 до 1 000 000 000";
    public const string AmountPositive = "Сума має бути більшою за нуль";
    public const string AmountTooLarge = "Сума завелика";

    public const string InvalidDate = "Вкажіть дату не раніше 2000 року й не пізніше завтрашнього дня";
    public const string AccountNotFound = "Рахунок не знайдено";
    public const string CategoryNotFound = "Категорію не знайдено";
    public const string CategoryTypeMismatch = "Категорія не відповідає типу транзакції";
    public const string GoalOnlyForContribution = "Ціль можна вказати лише для категорії «Внесок у ціль»";
    public const string GoalNotFound = "Ціль не знайдено";

    public const string ChooseIcon = "Оберіть іконку зі списку";
    public const string ChooseColor = "Оберіть колір зі списку";

    public const string ToBeforeFrom = "Кінцева дата має бути не раніше початкової";
    public const string UnknownSort = "Невідоме сортування";
    public const string PageMin = "Номер сторінки має бути не меншим за 1";
    public const string PageSizeAllowed = "Розмір сторінки має бути 10, 20 або 50";
    public const string InvalidMonth = "Вкажіть місяць у форматі РРРР-ММ";

    public const string ConsentRequired = "Потрібна згода на обробку даних";
    public const string MessageLength = "Повідомлення має містити від 10 до 1000 символів";
    public const string InvalidPlan = "Оберіть доступний тариф";

    public const string BudgetCategoryNotExpense = "Бюджет можна створити лише для категорії витрат";
    public const string ContributionExceedsRemaining = "Сума внеску перевищує залишок до цілі";
    public const string DeadlineInFuture = "Вкажіть дату в майбутньому";
}
