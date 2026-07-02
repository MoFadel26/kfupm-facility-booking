namespace ResourceManager.Api.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }

    public NotFoundException(string entityName, Guid id)
        : base($"{entityName} with id '{id}' was not found.") { }

    public NotFoundException(string entityName, string id)
        : base($"{entityName} with id '{id}' was not found.") { }
}
