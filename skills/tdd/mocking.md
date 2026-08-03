# When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, etc.) — use `Http::fake()`, `Mail::fake()`, `Notification::fake()`
- Databases (sometimes - prefer test DB)
- Time/randomness — use `travel()` / `Carbon::setTestNow()`
- File system (sometimes) — use `Storage::fake()`

Don't mock:

- Your own classes/modules
- Internal collaborators
- Anything you control

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```php
// Easy to mock
class PaymentProcessor
{
    public function __construct(private PaymentClient $client) {}

    public function process(Order $order)
    {
        return $this->client->charge($order->total);
    }
}

// Hard to mock
class PaymentProcessor
{
    public function process(Order $order)
    {
        $client = new StripeClient(config('services.stripe.key'));
        return $client->charge($order->total);
    }
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific methods for each external operation instead of one generic entry point with conditional logic:

```php
// GOOD: Each method independently mockable
interface OrderApi
{
    public function getUser(string $id): User;
    public function getOrders(string $userId): array;
    public function createOrder(array $data): Order;
}

// BAD: Mocking requires conditional logic inside the mock
interface OrderApi
{
    public function request(string $endpoint, array $options = []): array;
}
```

The SDK approach means:

- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per method
