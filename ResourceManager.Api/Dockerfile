# syntax=docker/dockerfile:1

# The API only. The React app is built and hosted separately, on its own origin,
# and calls this API through CORS.
#
# Build from the repository root:
#   docker build -f ResourceManager.Api/Dockerfile -t resource-manager-api .
#
# The build stage runs on the build machine's own architecture and only the
# output targets the image's, so building the linux/amd64 image on an arm64 Mac
# does not emulate the compiler.

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG TARGETARCH
WORKDIR /src
# The project file alone first, so the restore layer is reused until a package
# reference changes.
COPY ResourceManager.Api/ResourceManager.Api.csproj ResourceManager.Api/
RUN dotnet restore ResourceManager.Api/ResourceManager.Api.csproj -a $TARGETARCH
COPY ResourceManager.Api/ ResourceManager.Api/
RUN dotnet publish ResourceManager.Api/ResourceManager.Api.csproj -c Release -a $TARGETARCH \
    --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
# The non-root user the .NET images ship with.
USER $APP_UID
ENTRYPOINT ["dotnet", "ResourceManager.Api.dll"]
