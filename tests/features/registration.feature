@bdd @writes
Feature: Customer registration
  A visitor can create an account using valid registration data.

  Scenario: TC-BDD-001 A visitor registers successfully
    Given a visitor opens the registration page
    When the visitor submits valid registration data
    Then the visitor is taken to the sign-in page
