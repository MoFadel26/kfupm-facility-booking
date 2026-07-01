namespace ResourceManager.Api.Models;

public class EntityBase
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

    internal void Touch(DateTimeOffset at) => UpdatedAt = at;
}