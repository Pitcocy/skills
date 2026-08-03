# Interface Design for Testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them**

   ```php
   // Testable
   class OrderProcessor
   {
       public function __construct(private PaymentGateway $gateway) {}

       public function process(Order $order) {}
   }

   // Hard to test
   class OrderProcessor
   {
       public function process(Order $order)
       {
           $gateway = new StripeGateway();
       }
   }
   ```

2. **Return results, don't produce side effects**

   ```php
   // Testable
   public function calculateDiscount(Cart $cart): Discount {}

   // Hard to test
   public function applyDiscount(Cart $cart): void
   {
       $cart->total -= $discount;
   }
   ```

3. **Small surface area**
   - Fewer methods = fewer tests needed
   - Fewer params = simpler test setup
