using Microsoft.AspNetCore.Mvc;
using Sable.Application.Abstractions;
using Sable.Application.Common;

namespace Sable.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase(ICurrentUser currentUser) : ControllerBase
{
    protected Guid UserId => currentUser.UserId ?? throw Errors.Unauthorized();
}
