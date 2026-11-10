@bdd @writes
Feature: Checkout and invoicing
  A customer receives an invoice after paying with a supported method.

  Scenario Outline: <case> A customer completes checkout using <method>
    Given an authenticated customer has reached payment with a cart
    When the customer checks payment by "<method>"
    Then the order is confirmed with an invoice number

    Examples:
      | case       | method            |
      | TC-BDD-010 | bank-transfer     |
      | TC-BDD-011 | cash-on-delivery  |
      | TC-BDD-012 | credit-card       |
      | TC-BDD-013 | buy-now-pay-later |
      | TC-BDD-014 | gift-card         |
