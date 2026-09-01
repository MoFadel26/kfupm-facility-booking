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
        var response = await Client.PostAsJsonAsync("/api/facilities", new FacilityRequest
        {
            FacilityId = facilityId,
            Name = $"Facility {facilityId}",
            Type = FacilityType.Classroom,
            AllowedGender = allowedGender,
            AllowedRole = allowedRole
        }, ApiFixture.Json);

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<FacilityResponse>(ApiFixture.Json))!;
    }

    protected async Task<UserResponse> CreateUserAsync(
        string kfupmId = "202300001",
        UserRole role = UserRole.Student,
        Gender gender = Gender.Male)
    {
        var response = await Client.PostAsJsonAsync("/api/users", new UserRequest
        {
            KfupmId = kfupmId,
            Name = $"User {kfupmId}",
            Email = $"s{kfupmId}@kfupm.edu.sa",
            Role = role,
            Gender = gender
        }, ApiFixture.Json);

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserResponse>(ApiFixture.Json))!;
    }

    protected Task<HttpResponseMessage> PostReservationAsync(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string facilityId = "F-B22-124",
        string userId = "202300001",
        string reason = "Project meeting",
        int targetParticipantCount = 2)
        => Client.PostAsJsonAsync("/api/reservations", new CreateReservationRequest
        {
            StartTime = startTime,
            EndTime = endTime,
            Reason = reason,
            TargetParticipantCount = targetParticipantCount,
            FacilityId = facilityId,
            UserId = userId
        }, ApiFixture.Json);

    protected Task<HttpResponseMessage> PutReservationAsync(
        Guid id,
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        ReservationStatus status = ReservationStatus.Pending,
        string reason = "Project meeting",
        int targetParticipantCount = 2)
        => Client.PutAsJsonAsync($"/api/reservations/{id}", new UpdateReservationRequest
        {
            StartTime = startTime,
            EndTime = endTime,
            Reason = reason,
            TargetParticipantCount = targetParticipantCount,
            Status = status
        }, ApiFixture.Json);

    protected static async Task<ReservationResponse> ReadReservationAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<ReservationResponse>(ApiFixture.Json))!;

    /// <summary>Every list endpoint returns a page, never a bare array.</summary>
    protected async Task<PagedResult<T>> GetPageAsync<T>(string url)
        => (await Client.GetFromJsonAsync<PagedResult<T>>(url, ApiFixture.Json))!;
}
