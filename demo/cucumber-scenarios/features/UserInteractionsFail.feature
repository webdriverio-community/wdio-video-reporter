Feature: User interactions - Failure

  Background:
    Given I navigate to base url

  Scenario: I should be able edit text, then select a dropdown option (failure at the last step)
    Given I open inputs page
    And I enter message '1634343434'
    And I navigate to base url
    And I open dropdown page
    And I select dropdown option '2'
    Then Dropdown value should be 'Options 1'

  Scenario: I should be able to scroll a lot (failure at an earlier step)
    Given I open scrolling page
    And I scroll a lot
    Then Paragraph count should be '1'
    And I open inputs page
