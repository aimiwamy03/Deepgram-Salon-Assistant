const test = require('node:test');
const assert = require('node:assert/strict');
const { toDisplay } = require('../public/digits');

const cases = [
  ['Your number is four one five, five five five, zero one zero zero, right?', 'Your number is (415) 555-0100, right?'],
  ['Your confirmation code is B K one zero zero one.', 'Your confirmation code is BK1001.'],
  ['Your confirmation code is B, K, one, zero, zero, one.', 'Your confirmation code is BK1001.'],
  ['That is forty five dollars.', 'That is $45.'],
  ['The total is seventy five dollars.', 'The total is $75.'],
  ['A balayage is one hundred eighty five dollars.', 'A balayage is $185.'],
  ['I have two thirty or four fifteen.', 'I have 2:30 or 4:15.'],
  ['How about two thirty in the afternoon?', 'How about 2:30 in the afternoon?'],
  ['Dani is free at twelve noon on Sunday, October twenty fifth.', 'Dani is free at 12 noon on Sunday, October 25.'],
  ['Skin Fade at twelve, then Kids Cut at twelve thirty, with Dani.', 'Skin Fade at 12, then Kids Cut at 12:30, with Dani.'],
  ['See you on October first at ten a m.', 'See you on October 1 at 10 AM.'],
  ['It takes forty five minutes.', 'It takes 45 minutes.'],
  ['They are rated four point eight stars.', 'They are rated 4.8 stars.'],
  ['One more thing, is that for one person?', 'One more thing, is that for one person?'],
  ['Which one works for you?', 'Which one works for you?'],
  ['at three p m', 'at 3 PM'],
  ['Two oh five works.', '2:05 works.'],
  ['starting at two thirty or three.', 'starting at 2:30 or 3.'],
  ['Do you want one or two services?', 'Do you want one or two services?'],
  ['我想预约周日中午十二点。', '我想预约周日中午十二点。'],
  ['Sí, a las doce y media.', 'Sí, a las doce y media.'],
  ['My number is 415 555 0100', 'My number is 415 555 0100'],
];

for (const [input, want] of cases) {
  test(`digits: ${input}`, () => assert.equal(toDisplay(input), want));
}
