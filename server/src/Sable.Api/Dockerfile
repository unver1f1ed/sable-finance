# Build context: the server/ folder (see docker-compose.yml).

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached while only source files change.
COPY Directory.Build.props ./
COPY src/Sable.Domain/Sable.Domain.csproj src/Sable.Domain/
COPY src/Sable.Application/Sable.Application.csproj src/Sable.Application/
COPY src/Sable.Infrastructure/Sable.Infrastructure.csproj src/Sable.Infrastructure/
COPY src/Sable.Api/Sable.Api.csproj src/Sable.Api/
RUN dotnet restore src/Sable.Api/Sable.Api.csproj

COPY src/ src/
RUN dotnet publish src/Sable.Api/Sable.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Sable.Api.dll"]
