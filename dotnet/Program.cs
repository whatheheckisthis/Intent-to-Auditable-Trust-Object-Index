using Iato.Graph;

if (args.Length != 1 || args[0] != "--live-entra")
{
    Console.Error.WriteLine("Usage: iato --live-entra");
    return 2;
}

try
{
    var graph = GraphClientFactory.Create();
    var collector = new EntraCollector(graph);
    var snapshot = await collector.CollectAsync();
    await EntraCollector.WriteJsonAsync(snapshot, Console.Out);
    return 0;
}
catch (Exception exception)
{
    // Avoid logging request bodies, tokens, or credential material.
    Console.Error.WriteLine($"Entra collection failed: {exception.GetType().Name}: {exception.Message}");
    return 1;
}
