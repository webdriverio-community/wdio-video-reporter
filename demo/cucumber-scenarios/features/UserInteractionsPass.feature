Feature: User interactions - Pass

  Background:
    Given I navigate to base url
    And I close close ad-popups

  Scenario: I should be able to edit inputs (should pass)
    Given I open Basic Examples tab
    And I open 'basic-first-form' demo
    When I enter message 'Presidenten'
    And I click 'Show Message'
    Then My message 'Presidenten' should be displayed
