namespace Sable.Tests.Infrastructure;

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
