let t = 1450;
for (let i = 8; i > 0; i--) {
  let n = (0.18 + 0.01 * i) * t;
  console.log(n);
  t = t - n;
}
