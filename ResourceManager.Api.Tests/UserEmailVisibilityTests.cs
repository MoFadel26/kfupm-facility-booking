using System.Net.Http.Json;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Tests;

/// <summary>
/// The user list is public, so it must not hand out everyone's email. Admins see every
/// email; a signed-in user sees their own; everyone else gets null.
/// </summary>
public class UserEmailVisibilityTests : ApiTestBase
{
    private const string Student = "202300001";
    private const string OtherStudent = "202300002";

    public UserEmailVisibilityTests(ApiFixture fixture) : base(fixture) { }

    private async Task<IReadOnlyList<UserResponse>> ListAsAsync(string? actingUserId)
    {
        var response = await SendAsync(HttpMethod.Get, "/api/users?pageSize=100", actingUserId);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PagedResult<UserResponse>>(ApiFixture.Json))!.Items;
    }

    [Fact]
    public async Task Anonymous_callers_see_no_emails()
    {
        await CreateUserAsync(Student);

        var users = await ListAsAsync(null);

        Assert.NotEmpty(users);
        Assert.All(users, u => Assert.Null(u.Email));
    }

    [Fact]
    public async Task A_signed_in_user_sees_only_their_own_email()
    {
        await CreateUserAsync(Student);
        await CreateUserAsync(OtherStudent);

        var users = await ListAsAsync(Student);

        Assert.Equal($"s{Student}@kfupm.edu.sa", users.Single(u => u.KfupmId == Student).Email);
        Assert.All(users.Where(u => u.KfupmId != Student), u => Assert.Null(u.Email));
    }

    [Fact]
    public async Task An_admin_sees_every_email()
    {
        await CreateUserAsync(Student);

        var users = await ListAsAsync(ApiFixture.AdminKfupmId);

        Assert.All(users, u => Assert.False(string.IsNullOrEmpty(u.Email)));
    }

    [Fact]
    public async Task Getting_one_user_anonymously_hides_the_email()
    {
        var user = await CreateUserAsync(Student);

        var response = await SendAsync(HttpMethod.Get, $"/api/users/{user.Id}", userId: null);
        response.EnsureSuccessStatusCode();

        Assert.Null((await response.Content.ReadFromJsonAsync<UserResponse>(ApiFixture.Json))!.Email);
    }
}
