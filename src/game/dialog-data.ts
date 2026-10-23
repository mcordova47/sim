import { choice, menu, say } from "./dialog";

// "Contemplate" as data: a menu of things to think about, each with a short,
// slightly silly reply. "Existence" opens a second menu, to show that menus
// nest and that cancel backs out of them. Placeholder content until the
// personal task list (issue 024) is written.
const existence = menu("Which part?", [
  choice(
    "Why anything exists",
    say(
      "Why is there something rather than nothing? You think about it for a while. The answer is probably the dishes.",
    ),
  ),
  choice(
    "Why it is like this",
    say("It could have been otherwise. It could have been worse. It could have been a Tuesday."),
  ),
  choice("Never mind"),
]);

export const CONTEMPLATE = menu("Contemplate what?", [
  choice("Existence", existence),
  choice(
    "The state of democracy",
    say(
      "You open a tab to check. You open eleven more. By the time you close them it is dark out and nothing is settled.",
    ),
  ),
  choice(
    "Late stage capitalism",
    say(
      "You subscribe to a service that helps you cancel your other subscriptions. It is $4.99 a month. You feel nothing.",
    ),
  ),
  choice(
    "The impermanence of everything",
    say(
      "The mug will break. The couch will sag. The song you wrote last week will be forgotten, and so will this thought. Still, the coffee was good.",
    ),
  ),
  choice("Nothing, actually"),
]);
