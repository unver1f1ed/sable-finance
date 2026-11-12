namespace Sable.Infrastructure.Finance.Seed;

public static class ReviewSeed
{
    public sealed record ReviewDefinition(string Author, string Text, int Rating);

    /// <summary>Newest first: the first item gets the latest creation date.</summary>
    public static readonly ReviewDefinition[] Reviews =
    [
        new("Марта Д.", "Цілі з прогресом мотивують відкладати щомісяця. За пів року зібрала на відпустку без жодних позик.", 5),
        new("Катерина О.", "Чудова підтримка. Я перейшла зі звичайних таблиць на Sable, і команда допомогла розібратися з усіма питаннями під час переходу.", 5),
        new("Євген Б.", "Найкращий сервіс для планування бюджету. Нарешті бачу, куди йдуть гроші щомісяця. Дякую, Sable!", 5),
        new("Олег П.", "Зручно, що бюджет попереджає заздалегідь. Перестав дивуватися, куди зникає зарплата наприкінці місяця.", 5)
    ];
}
