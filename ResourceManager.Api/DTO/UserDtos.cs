using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.DTO;

public class UserRequest
{
    [Required, MaxLength(20)]
    public string KfupmId { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public Gender Gender { get; set; }
}

public class UserResponse
{
    public Guid Id { get; set; }
    public string KfupmId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public Gender Gender { get; set; }
}

public static class UserMappingExtensions
{
    /// <summary>
    /// An expression, not a method body, so EF translates it into the SELECT list. A list
    /// query then reads exactly these columns instead of materialising whole entities and
    /// their navigations only to copy a few fields out of them.
    /// </summary>
    public static readonly Expression<Func<User, UserResponse>> Projection = user => new UserResponse
    {
        Id = user.Id,
        KfupmId = user.KfupmId,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role,
        Gender = user.Gender
    };

    private static readonly Func<User, UserResponse> Map = Projection.Compile();

    /// <summary>In-memory mapping for an entity already loaded.</summary>
    public static UserResponse ToResponse(this User user) => Map(user);
}
