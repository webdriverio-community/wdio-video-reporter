Feature: User interactions - Failure

  Background:
    Given I navigate to base url
    And I close close ad-popups

  Scenario: I should be able to edit sliders (failure at the last step)
    Given I open Advanced Examples tab
    And I open 'drag-drop-range' demo
    When I click first slider
    Then Slider range should be '30'

  Scenario: I should be able to edit sliders (failure at an earlier step)
    Given I open Advanced Examples tab
    And I open 'drag-drop-range' demo
    When I click first slider
    Then Slider range should be '30'
    And I navigate to base url
