using System.Net;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// Creating, changing and deleting users and facilities is for admins only. The role is
/// read from the database on every request, so a demotion applies at once.
/// </summary>
public class AdminPolicyTests : ApiTestBase
{
    private const string Student = "202300001";

    public AdminPolicyTests(ApiFixture fixture) : base(fixture) { }

    private static readonly CreateUserRequest UserBody = new()
    {
        KfupmId = "202300002",
        Name = "New User",
        Email = "new@kfupm.edu.sa",
        Role = UserRole.Student,
        Gender = Gender.Male,
        Password = "new-user-password"
    };

    private static readonly SetPasswordRequest PasswordBody = new() { Password = "reset-password-1" };

    private static readonly FacilityRequest FacilityBody = new()
    {
        FacilityId = "F-NEW",
        Name = "New Facility",
        Type = FacilityType.Classroom
    };

    /// <summary>
    /// Every admin-only write. The id need not exist: authorization runs before the
    /// action, so a refusal comes before any 404.
    /// </summary>
    public static TheoryData<string, string> Writes => new()
    {
        { "POST", "/api/users" },
        { "PUT", $"/api/users/{AnyId}" },
        { "DELETE", $"/api/users/{AnyId}" },
        { "PUT", $"/api/users/{AnyId}/password" },
        { "POST", "/api/facilities" },
        { "PUT", $"/api/facilities/{AnyId}" },
        { "DELETE", $"/api/facilities/{AnyId}" }
    };

    private const string AnyId = "6f1c1a52-8f0e-4c3b-9d7a-2b5e4f6a7c81";

    private Task<HttpResponseMessage> SendWriteAsync(string method, string url, string? userId)
    {
        object? body = method == "DELETE" ? null
            : url.EndsWith("/password") ? PasswordBody
            : url.StartsWith("/api/users") ? UserBody
            : FacilityBody;
        return SendAsync(new HttpMethod(method), url, userId, body);
    }

    [Theory]
    [MemberData(nameof(Writes))]
    public async Task A_write_without_a_token_is_unauthorized(string method, string url)
    {
        var response = await SendWriteAsync(method, url, userId: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(Writes))]
    public async Task A_write_by_a_student_is_forbidden(string method, string url)
    {
        await CreateUserAsync(Student);

        var response = await SendWriteAsync(method, url, Student);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task An_admin_can_create_change_and_delete_a_user()
    {
        var user = await CreateUserAsync(UserBody.KfupmId);

        var update = await SendAsync(HttpMethod.Put, $"/api/users/{user.Id}", ApiFixture.AdminKfupmId, UserBody);
        var delete = await SendAsync(HttpMethod.Delete, $"/api/users/{user.Id}", ApiFixture.AdminKfupmId);

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Fact]
    public async Task An_admin_can_create_change_and_delete_a_facility()
    {
        var facility = await CreateFacilityAsync(FacilityBody.FacilityId);

        var update = await SendAsync(HttpMethod.Put, $"/api/facilities/{facility.Id}", ApiFixture.AdminKfupmId, FacilityBody);
        var delete = await SendAsync(HttpMethod.Delete, $"/api/facilities/{facility.Id}", ApiFixture.AdminKfupmId);

        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
    }

    [Fact]
    public async Task A_demoted_admin_is_refused_on_the_next_request()
    {
        const string formerAdmin = "202300009";
        await CreateUserAsync(formerAdmin, UserRole.Admin);
        var token = Fixture.CreateToken(formerAdmin);
        var before = await SendWithTokenAsync(HttpMethod.Post, "/api/facilities", token, FacilityBody);
        Assert.Equal(HttpStatusCode.Created, before.StatusCode);

        await Fixture.QueryAsync(db => db.Users
            .Where(u => u.KfupmId == formerAdmin)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.Role, UserRole.Student)));

        // The same token as before; only the database changed.
        var after = await SendWithTokenAsync(HttpMethod.Post, "/api/facilities", token, new FacilityRequest
        {
            FacilityId = "F-NEWER",
            Name = "Newer Facility",
            Type = FacilityType.Classroom
        });
        Assert.Equal(HttpStatusCode.Forbidden, after.StatusCode);
    }
}
