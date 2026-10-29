using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// An admin gives a new user their first password and can set or reset anyone's. That is
/// the only way in for users from before passwords existed.
/// </summary>
public class UserPasswordTests : ApiTestBase
{
    private const string Student = "202300001";

    public UserPasswordTests(ApiFixture fixture) : base(fixture) { }

    private Task<HttpResponseMessage> LoginAsync(string kfupmId, string password)
        => Client.PostAsJsonAsync("/api/auth/login", new LoginRequest { KfupmId = kfupmId, Password = password }, ApiFixture.Json);

    private Task<HttpResponseMessage> SetPasswordAsync(Guid id, string password)
        => SendAsync(HttpMethod.Put, $"/api/users/{id}/password", ApiFixture.AdminKfupmId,
            new SetPasswordRequest { Password = password });

    [Fact]
    public async Task A_user_created_by_an_admin_can_log_in_with_the_initial_password()
    {
        await CreateUserAsync(Student);

        var response = await LoginAsync(Student, UserPassword);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Creating_a_user_without_a_password_is_rejected()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/users", ApiFixture.AdminKfupmId, new UserRequest
        {
            KfupmId = Student,
            Name = "No Password",
            Email = "nopassword@kfupm.edu.sa",
            Role = UserRole.Student,
            Gender = Gender.Male
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task The_created_user_response_has_no_password_or_hash()
    {
        var response = await SendAsync(HttpMethod.Post, "/api/users", ApiFixture.AdminKfupmId, new CreateUserRequest
        {
            KfupmId = Student,
            Name = "User",
            Email = "user@kfupm.edu.sa",
            Role = UserRole.Student,
            Gender = Gender.Male,
            Password = UserPassword
        });

        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.DoesNotContain("password", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task An_admin_can_give_a_user_without_a_password_one()
    {
        var user = await CreateUserAsync(Student);
        // A user from before passwords existed.
        await Fixture.QueryAsync(db => db.Users
            .Where(u => u.KfupmId == Student)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, (string?)null)));
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(Student, UserPassword)).StatusCode);

        var set = await SetPasswordAsync(user.Id, "first-password-1");

        Assert.Equal(HttpStatusCode.NoContent, set.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(Student, "first-password-1")).StatusCode);
    }

    [Fact]
    public async Task Resetting_a_password_replaces_the_old_one()
    {
        var user = await CreateUserAsync(Student);

        (await SetPasswordAsync(user.Id, "replacement-password")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginAsync(Student, UserPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(Student, "replacement-password")).StatusCode);
    }

    [Fact]
    public async Task Setting_the_password_of_an_unknown_user_is_not_found()
    {
        var response = await SetPasswordAsync(Guid.NewGuid(), "some-password-1");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task A_password_shorter_than_eight_characters_is_rejected()
    {
        var user = await CreateUserAsync(Student);

        var response = await SetPasswordAsync(user.Id, "short");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
