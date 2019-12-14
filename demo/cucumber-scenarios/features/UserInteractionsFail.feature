Feature: User interactions

  Background:
    Given I navigate to base url

  Scenario: I should be able to edit sliders (should fail)
    Given I open Advanced Examples tab
    And I open 'drag-drop-range' demo
    When I click first slider
    Then Slider range should be '30'
