using System.ComponentModel.DataAnnotations;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.DTO;

/// <summary>The shared fields carry the same rules as <see cref="UserRequest"/>. There is no
/// Role: a new account is a Student unless it is the configured bootstrap admin.</summary>
public class RegisterRequest
{
    [Required, MaxLength(20)]
    public string KfupmId { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    public Gender Gender { get; set; }

    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}

public class LoginRequest
{
    [Required]
    public string KfupmId { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public UserResponse User { get; set; } = null!;
}
