const test = require('node:test');
const assert = require('node:assert/strict');
const { spokenDigitRuns, saidPhone, phoneReadBack } = require('../src/readback');

const P = '4155550123';
test('read back: digits in English, Spanish, Mandarin, and numerals', () => {
  for (const t of [
    'Is that four one five, five five five, zero one two three?',
    'Got it, four one five. Five five five. Oh one two three.',
    'four one five double five five oh one two three',
    'Su número es cuatro uno cinco, cinco cinco cinco, cero uno dos tres, ¿correcto?',
    '您的电话是四一五，五五五，零一二三，对吗？',
    'So that is (415) 555-0123, right?',
  ]) assert.equal(saidPhone(t, P), true, t);
});

test('read back: other numbers and partial numbers do not count', () => {
  assert.deepEqual(spokenDigitRuns('Two thirty with Dani, four one five'), ['2', '415']);
  assert.deepEqual(spokenDigitRuns('Oh, hi there'), []);
  for (const t of ['Your number ends in zero one two three?', 'four one five, five five five, zero one zero zero', 'Skin Fade at two, then Kids Cut at two thirty, forty five dollars']) assert.equal(saidPhone(t, P), false, t);
});

test('read back: needs a caller turn after the read back', () => {
  const h = [{ role: 'user', content: 'My number is 415 555 0123' }];
  assert.equal(phoneReadBack(h, P).reason, 'NOT_READ_BACK');
  h.push({ role: 'assistant', content: 'Four one five, five five five, zero one two three, right?' });
  assert.equal(phoneReadBack(h, P).reason, 'NOT_CONFIRMED');
  h.push({ role: 'user', content: 'Yes' });
  assert.equal(phoneReadBack(h, P).ok, true);
});
