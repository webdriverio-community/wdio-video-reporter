Feature: User interactions - Pass

  Background:
    Given I navigate to base url

  Scenario: I should be able to edit inputs (should pass)
    Given I open inputs page
    When I enter message '46985576664848'
    Then My message '46985576664848' should be displayed
