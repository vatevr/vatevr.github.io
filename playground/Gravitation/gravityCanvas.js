(function($, document, window){
  $(function(){
    /* ---- SETTINGS ---- */

    const PARTICLE_NUMBERS = 500;
    const GRAVITY_POINT_NUMBERS = 15;
    const PARTICULE_SPEED = 0.4;
    const VELOCITY = 0.95;
    const COLORS = ["#F2F3AE","#ECFF8B","#FFFCF9","#E0F2E9","#FCD9EE"];

    /* ---- Particle ---- */
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;

        this.vel = Math.randomF(-100, 100);

        this.vel = {
          x : this.vel,
          y : this.vel,
          max : Math.randomF(2, 10)
        };

        this.train = [];

        this.color = COLORS[Math.floor(Math.random()*COLORS.length)];
      }

      render() {
        context.beginPath();
        context.strokeStyle = this.color;
        context.lineWidth = 1;
        context.moveTo(this.train[0].x,this.train[0].y);
        let i = this.train.length-1;
        for (i; i > 0; i--) {
          context.lineTo(this.train[i].x,this.train[i].y);
        }
        context.stroke();
      }

      update(gPoints) {
        const force = this.getForceOfNearestGravityPoint();
        this.vel.x += force.x;
        this.vel.y += force.y;

        this.x += this.vel.x*PARTICULE_SPEED;
        this.y += this.vel.y*PARTICULE_SPEED;

        if(Math.abs(this.vel.x) > this.vel.max)
            this.vel.x *= VELOCITY;
        if(Math.abs(this.vel.y) > this.vel.max)
            this.vel.y *= VELOCITY;

        //trains
        this.train.push({
          x : this.x,
          y : this.y
        });
        if(this.train.length > 10)
          this.train.splice(0,1);
      }

      getForceOfNearestGravityPoint() {
        let gpSelected;
        let nearestD = 9999;
        let d;
        gPoints.map((gp) => {
          d = getDist(gp.x, gp.y, this.x, this.y);
          if(nearestD > d) {
            nearestD = d;
            gpSelected = gp;
          }
        });
        return gpSelected.getForceDirection(this.x, this.y, nearestD);
      }
    }

    /* ---- GravityPoint ---- */
    class GravityPoint {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.gravity = Math.randomF(0.5, 4);
      }
      render() {
        context.beginPath();
        context.strokeStyle = "#4F5AF2";
        context.lineWidth = 2;
        context.arc(this.x,this.y, this.gravity*4, 0, Math.PI*2);
        context.stroke();
      }
      getForceDirection(x, y, dist) {
        const F = this.gravity/dist;
        return {
          x : ((this.x - x)*0.1) * F,
          y : ((this.y - y)*0.1) * F
        }
      }
    }

    /* ---- Functions ----*/
    function loop(){
    	context.clearRect(0,0, canvas.width, canvas.height);
      gPoints.map((g, index) => {
        g.render();
    	});
    	particles.map((p, index) => {
        p.update(gPoints);
        p.render();
    	});
    	requestAnimationFrame(loop);
    }

    Math.sqr = function(a) {
        return a*a;
    }
    Math.randomF = function(min, max) {
      return Math.random() * (max - min) + min;
    }
    function getDist(x1, y1, x2, y2) {
      return Math.sqrt(Math.sqr(y2 - y1) + Math.sqr(x2 - x1));
    }

    /* ---- START ---- */

    let particles = [];
    let gPoints = [];

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext("2d");

    canvas.id = "canvas";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.body.appendChild(canvas);

    for (let i = 0; i < PARTICLE_NUMBERS ; i++) {
    	particles.push(new Particle(
    		Math.randomF(0, windowWidth),
    		Math.randomF(0, windowHeight)
    	));
    }
    for (let i = 0; i < GRAVITY_POINT_NUMBERS ; i++) {
      gPoints.push(new GravityPoint(
        Math.randomF(windowWidth/5, windowWidth - (windowWidth/5)),
    		Math.randomF(windowHeight/5, windowHeight - (windowHeight/5))
      ));
    }

    loop();

  })
}(window.jQuery, document, window));
