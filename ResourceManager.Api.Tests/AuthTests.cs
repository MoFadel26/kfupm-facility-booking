using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Tests;

/// <summary>
/// The API issues its own tokens: registering or logging in returns one, and it works on
/// the endpoints that need a bearer token.
/// </summary>
public class AuthTests : ApiTestBase
{
    private const string Student = "202300001";
    private const string Password = "correct horse battery";

    public AuthTests(ApiFixture fixture) : base(fixture) { }

    private Task<HttpResponseMessage> RegisterAsync(string kfupmId, string? email = null, string password = Password)
        => Client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            KfupmId = kfupmId,
            Name = $"User {kfupmId}",
            Email = email ?? $"s{kfupmId}@kfupm.edu.sa",
            Gender = Gender.Male,
            Password = password
        }, ApiFixture.Json);

    private Task<HttpResponseMessage> LoginAsync(string kfupmId, string password)
        => Client.PostAsJsonAsync("/api/auth/login", new LoginRequest { KfupmId = kfupmId, Password = password }, ApiFixture.Json);

    private static async Task<AuthResponse> ReadAuthAsync(HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<AuthResponse>(ApiFixture.Json))!;

    [Fact]
    public async Task Registering_creates_a_student_whose_token_can_book()
    {
        await CreateFacilityAsync();

        var response = await RegisterAsync(Student);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.DoesNotContain("password", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        var auth = await ReadAuthAsync(response);
        Assert.Equal(Student, auth.User.KfupmId);
        Assert.Equal(UserRole.Student, auth.User.Role);
        Assert.InRange(auth.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(59), DateTimeOffset.UtcNow.AddMinutes(61));

        var booking = await SendWithTokenAsync(HttpMethod.Post, "/api/reservations", auth.Token, new CreateReservationRequest
        {
            StartTime = At(10),
            EndTime = At(12),
            Reason = "Project meeting",
            TargetParticipantCount = 2,
            FacilityId = "F-B22-124"
        });

        Assert.Equal(HttpStatusCode.Created, booking.StatusCode);
        Assert.Equal(Student, (await ReadReservationAsync(booking)).UserId);
    }

    [Fact]
    public async Task Registering_the_bootstrap_id_creates_an_admin()
    {
        var response = await RegisterAsync(ApiFixture.BootstrapAdminKfupmId);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(UserRole.Admin, (await ReadAuthAsync(response)).User.Role);
    }

    [Fact]
    public async Task Registering_a_taken_kfupm_id_is_a_conflict()
    {
        (await RegisterAsync(Student)).EnsureSuccessStatusCode();

        var response = await RegisterAsync(Student, email: "another@kfupm.edu.sa");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Registering_a_taken_email_is_a_conflict()
    {
        (await RegisterAsync(Student)).EnsureSuccessStatusCode();

        var response = await RegisterAsync("202300002", email: $"s{Student}@kfupm.edu.sa");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_password_shorter_than_eight_characters_is_rejected()
    {
        var response = await RegisterAsync(Student, password: "1234567");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task The_password_is_stored_hashed()
    {
        (await RegisterAsync(Student)).EnsureSuccessStatusCode();

        var hash = await Fixture.QueryAsync(db => db.Users.Where(u => u.KfupmId == Student).Select(u => u.PasswordHash).SingleAsync());

        Assert.False(string.IsNullOrEmpty(hash));
        Assert.DoesNotContain(Password, hash);
    }

    [Fact]
    public async Task Logging_in_with_the_right_password_returns_a_working_token()
    {
        (await RegisterAsync(Student)).EnsureSuccessStatusCode();

        var response = await LoginAsync(Student, Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var auth = await ReadAuthAsync(response);
        Assert.Equal(Student, auth.User.KfupmId);
        var me = await SendWithTokenAsync(HttpMethod.Get, "/api/auth/me", auth.Token);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
    }

    /// <summary>
    /// A wrong password, an unknown id and an account with no password look the same, so
    /// the response does not tell a caller which KFUPM ids have accounts.
    /// </summary>
    [Fact]
    public async Task Every_failed_login_gets_the_same_401()
    {
        (await RegisterAsync(Student)).EnsureSuccessStatusCode();
        // A user from before passwords existed.
        await CreateUserAsync("202300002");
        await Fixture.QueryAsync(db => db.Users
            .Where(u => u.KfupmId == "202300002")
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, (string?)null)));

        var responses = new[]
        {
            await LoginAsync(Student, "wrong password"),
            await LoginAsync("202399999", Password),
            await LoginAsync("202300002", Password)
        };

        var details = new List<string?>();
        foreach (var response in responses)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            details.Add((await response.Content.ReadFromJsonAsync<ProblemDetails>())!.Detail);
        }
        Assert.False(string.IsNullOrEmpty(details[0]));
        Assert.Single(details.Distinct());
    }

    [Fact]
    public async Task Me_returns_the_token_user()
    {
        var auth = await ReadAuthAsync(await RegisterAsync(Student));

        var response = await SendWithTokenAsync(HttpMethod.Get, "/api/auth/me", auth.Token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = (await response.Content.ReadFromJsonAsync<UserResponse>(ApiFixture.Json))!;
        Assert.Equal(auth.User.Id, user.Id);
    }

    [Fact]
    public async Task Me_without_a_token_is_unauthorized()
    {
        var response = await Client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_for_a_user_who_no_longer_exists_is_forbidden()
    {
        var response = await SendAsync(HttpMethod.Get, "/api/auth/me", "999999999");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
