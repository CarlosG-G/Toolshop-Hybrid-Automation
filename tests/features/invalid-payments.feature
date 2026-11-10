@bdd @writes @negative
Feature: Payment data validation
  Invalid payment data must not be submitted.

  Scenario Outline: <case> A customer enters an invalid <rule>
    Given an authenticated customer has reached payment with a cart
    When the customer enters invalid payment data for "<rule>"
    Then payment submission remains disabled

    Examples:
      | case       | rule                                        |
      | TC-BDD-020 | credit card number without dashes           |
      | TC-BDD-021 | credit card CVV with 2 digits               |
      | TC-BDD-022 | credit card holder with digits              |
      | TC-BDD-023 | bank name with digits                       |
      | TC-BDD-024 | bank account number with letters            |
      | TC-BDD-025 | gift card validation code with 3 characters |
