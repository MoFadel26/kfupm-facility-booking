using System.Net.Http.Headers;
using System.Net.Http.Json;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

[Collection(ApiCollection.Name)]
public abstract class ApiTestBase : IAsyncLifetime
{
    protected readonly ApiFixture Fixture;
    protected readonly HttpClient Client;

    protected ApiTestBase(ApiFixture fixture)
    {
        Fixture = fixture;
        Client = fixture.CreateClient();
    }

    /// <summary>Tests in a collection run one at a time, so a shared database can be emptied between them.</summary>
    public Task InitializeAsync() => Fixture.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    // A fixed future date keeps the seeded reservation times away from "now" and makes
    // failures readable. Reservations are UTC.
    protected static DateTimeOffset At(int hour, int minute = 0)
        => new(2031, 3, 1, hour, minute, 0, TimeSpan.Zero);

    protected async Task<FacilityResponse> CreateFacilityAsync(
        string facilityId = "F-B22-124",
        AllowedGender allowedGender = AllowedGender.Any,
        AllowedRole allowedRole = AllowedRole.Any)
    {
        var response = await SendAsync(HttpMethod.Post, "/api/facilities", ApiFixture.AdminKfupmId, new FacilityRequest
        {
            FacilityId = facilityId,
            Name = $"Facility {facilityId}",
            Type = FacilityType.Classroom,
            AllowedGender = allowedGender,
            AllowedRole = allowedRole
        });

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<FacilityResponse>(ApiFixture.Json))!;
    }

    protected async Task<UserResponse> CreateUserAsync(
        string kfupmId = "202300001",
        UserRole role = UserRole.Student,
        Gender gender = Gender.Male)
    {
        var response = await SendAsync(HttpMethod.Post, "/api/users", ApiFixture.AdminKfupmId, new UserRequest
        {
            KfupmId = kfupmId,
            Name = $"User {kfupmId}",
            Email = $"s{kfupmId}@kfupm.edu.sa",
            Role = role,
            Gender = gender
        });

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserResponse>(ApiFixture.Json))!;
    }

    /// <summary>Sends as the given user, or with no token at all when <paramref name="userId"/> is null.</summary>
    protected Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, string? userId, object? body = null)
        => SendWithTokenAsync(method, url, userId is null ? null : Fixture.CreateToken(userId), body);

    /// <summary>Sends with the given token, or with none when <paramref name="token"/> is null.</summary>
    protected Task<HttpResponseMessage> SendWithTokenAsync(HttpMethod method, string url, string? token, object? body = null)
    {
        // Per request rather than on Client.DefaultRequestHeaders: some tests fire requests
        // concurrently, and some send them as different users.
        var request = new HttpRequestMessage(method, url);
        if (body is not null)
            request.Content = JsonContent.Create(body, body.GetType(), options: ApiFixture.Json);
        if (token is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return Client.SendAsync(request);
    }

    /// <summary><paramref name="userId"/> picks the token; the reservation belongs to whoever it names.</summary>
    protected Task<HttpResponseMessage> PostReservationAsync(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string facilityId = "F-B22-124",
        string userId = "202300001",
        string reason = "Project meeting",
        int targetParticipantCount = 2)
        => SendAsync(HttpMethod.Post, "/api/reservations", userId, new CreateReservationRequest
        {
            StartTime = startTime,
            EndTime = endTime,
            Reason = reason,
            TargetParticipantCount = targetParticipantCount,
            FacilityId = facilityId
        });

    protected Task<HttpResponseMessage> PutReservationAsync(
        Guid id,
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        ReservationStatus status = ReservationStatus.Pending,
        string reason = "Project meeting",
        int targetParticipantCount = 2,
        string userId = "202300001")
        => SendAsync(HttpMethod.Put, $"/api/reservations/{id}", userId, new UpdateReservationRequest
        {
            StartTime = startTime,
            EndTime = endTime,
            Reason = reason,
            TargetParticipantCount = targetParticipantCount,
            Status = status
        });

    protected static async Task<ReservationResponse> ReadReservationAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<ReservationResponse>(ApiFixture.Json))!;

    /// <summary>Every list endpoint returns a page, never a bare array.</summary>
    protected async Task<PagedResult<T>> GetPageAsync<T>(string url)
        => (await Client.GetFromJsonAsync<PagedResult<T>>(url, ApiFixture.Json))!;
}
