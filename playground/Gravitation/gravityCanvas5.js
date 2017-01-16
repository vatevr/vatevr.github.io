var PARTICLE_NUMBERS = 500;
var GRAVITY_POINT_NUMBERS = 15;
var PARTICLE_SPEED = 0.4;
var VELOCITY = 0.95;
var COLORS = ["#F2F3AE","#ECFF8B","#FFFCF9","#E0F2E9","#FCD9EE"];

var Particle = function () {
  function Particle(x, y) {
    this.x = x;
    this.y = y;

    this.vel = Math.randomF(-4, 4);

    this.vel = {
      x: this.vel,
      y: this.vel,
      max: Math.randomF(2, 10)
    };

    this.train = [];
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  
}
