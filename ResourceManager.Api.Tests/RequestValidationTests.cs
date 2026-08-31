using System.Net;
using System.Net.Http.Json;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Shape rules — required, length, range, email format — belong to the DataAnnotations on
/// the request DTOs, which [ApiController] turns into a 400 before a service ever runs.
/// These tests hold that line, so the duplicate hand-written checks that used to sit in
/// the services can stay deleted.
/// </summary>
public class RequestValidationTests : ApiTestBase
{
    public RequestValidationTests(ApiFixture fixture) : base(fixture) { }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_reservation_needs_a_reason(string reason)
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var response = await PostReservationAsync(At(10), At(12), reason: reason);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task A_reservation_needs_at_least_one_participant(int count)
    {
        await CreateFacilityAsync();
        await CreateUserAsync();

        var response = await PostReservationAsync(At(10), At(12), targetParticipantCount: count);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("", "a@kfupm.edu.sa")]   // no name
    [InlineData("   ", "a@kfupm.edu.sa")]
    [InlineData("Name", "")]             // no email
    [InlineData("Name", "not-an-email")] // malformed email
    public async Task A_user_needs_a_name_and_a_valid_email(string name, string email)
    {
        var response = await Client.PostAsJsonAsync("/api/users", new UserRequest
        {
            KfupmId = "202300055",
            Name = name,
            Email = email,
            Role = UserRole.Student,
            Gender = Gender.Male
        }, ApiFixture.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("", "Name")]  // no facility id
    [InlineData("F-X", "")]   // no name
    [InlineData("F-X", "   ")]
    public async Task A_facility_needs_an_id_and_a_name(string facilityId, string name)
    {
        var response = await Client.PostAsJsonAsync("/api/facilities", new FacilityRequest
        {
            FacilityId = facilityId,
            Name = name,
            Type = FacilityType.Classroom
        }, ApiFixture.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_user_needs_a_kfupm_id()
    {
        var response = await Client.PostAsJsonAsync("/api/users", new UserRequest
        {
            KfupmId = "",
            Name = "Name",
            Email = "a@kfupm.edu.sa",
            Role = UserRole.Student,
            Gender = Gender.Male
        }, ApiFixture.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
