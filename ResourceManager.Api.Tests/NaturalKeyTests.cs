using System.Net;
using System.Net.Http.Json;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// KfupmId and FacilityId are the principal keys that reservations and participants
/// point at, and they stand for real-world identifiers that do not change. Editing one
/// is not a rename: the dependents keep pointing at a value that no longer exists, and
/// the database rejects it. The API refuses the change up front instead of returning a
/// 500 from a foreign key violation.
/// </summary>
public class NaturalKeyTests : ApiTestBase
{
    public NaturalKeyTests(ApiFixture fixture) : base(fixture) { }

    private Task<HttpResponseMessage> PutUserAsync(Guid id, string kfupmId) =>
        Client.PutAsJsonAsync($"/api/users/{id}", new UserRequest
        {
            KfupmId = kfupmId,
            Name = "Renamed",
            Email = "renamed@kfupm.edu.sa",
            Role = UserRole.Student,
            Gender = Gender.Male
        }, ApiFixture.Json);

    private Task<HttpResponseMessage> PutFacilityAsync(Guid id, string facilityId) =>
        Client.PutAsJsonAsync($"/api/facilities/{id}", new FacilityRequest
        {
            FacilityId = facilityId,
            Name = "Renamed",
            Type = FacilityType.Classroom,
            AllowedGender = AllowedGender.Any,
            AllowedRole = AllowedRole.Any
        }, ApiFixture.Json);

    [Fact]
    public async Task A_users_kfupm_id_cannot_change_while_a_reservation_references_it()
    {
        await CreateFacilityAsync();
        var user = await CreateUserAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PutUserAsync(user.Id, "202399999");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_users_kfupm_id_cannot_change_even_with_nothing_referencing_it()
    {
        var user = await CreateUserAsync();

        var response = await PutUserAsync(user.Id, "202399999");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_facility_id_cannot_change_while_a_reservation_references_it()
    {
        var facility = await CreateFacilityAsync();
        await CreateUserAsync();
        (await PostReservationAsync(At(10), At(12))).EnsureSuccessStatusCode();

        var response = await PutFacilityAsync(facility.Id, "F-RENAMED");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Everything_else_about_a_user_is_still_editable()
    {
        var user = await CreateUserAsync();

        var response = await PutUserAsync(user.Id, "202300001");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserResponse>(ApiFixture.Json))!;
        Assert.Equal("Renamed", updated.Name);
        Assert.Equal("renamed@kfupm.edu.sa", updated.Email);
    }

    [Fact]
    public async Task Everything_else_about_a_facility_is_still_editable()
    {
        var facility = await CreateFacilityAsync();

        var response = await PutFacilityAsync(facility.Id, "F-B22-124");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<FacilityResponse>(ApiFixture.Json))!;
        Assert.Equal("Renamed", updated.Name);
    }
}
