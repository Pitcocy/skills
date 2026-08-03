# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```php
// GOOD: Tests observable behavior
it('lets a user check out a valid cart', function () {
    $cart = new Cart();
    $cart->add($product);

    $result = (new Checkout)->process($cart, $paymentMethod);

    expect($result->status)->toBe('confirmed');
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```php
// BAD: Tests implementation details
it('calls paymentService->process', function () {
    $mock = Mockery::mock(PaymentService::class);
    $mock->shouldReceive('process')->with($cart->total)->once();

    (new Checkout($mock))->process($cart, $payment);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```php
// BAD: Bypasses interface to verify
it('saves users to the database', function () {
    (new UserService)->create(['name' => 'Alice']);

    $row = DB::table('users')->where('name', 'Alice')->first();

    expect($row)->not->toBeNull();
});

// GOOD: Verifies through interface
it('makes a created user retrievable', function () {
    $users = new UserService;
    $user = $users->create(['name' => 'Alice']);

    $retrieved = $users->find($user->id);

    expect($retrieved->name)->toBe('Alice');
});
```
