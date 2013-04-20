window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame		|| 
			window.webkitRequestAnimationFrame	|| 
			window.mozRequestAnimationFrame		|| 
			window.oRequestAnimationFrame		|| 
			window.msRequestAnimationFrame		|| 
			function(callback){
				window.setTimeout(callback, 1000 / 60);
			};
})();

onReady(function(){
	var keydown = {
		left : false,
		right : false,
		space : false,
		esc : false
	}

	/* Bind keyboard event */
	document.addEventListener('keydown', function(e){
		e = e || event;
		switch (e.keyCode) {
			case 37:
				keydown.left = true;
				break;
			case 39:
				keydown.right = true;
				break;
			case 32:
				keydown.space = true;
				break;
			case 27:
				keydown.esc = true;
				break;
			default: break;
		}
		// e.preventDefault ? e.preventDefault() : (e.returnValue = false);
	});
	document.addEventListener('keyup', function(e){
		e = e || event;
		switch (e.keyCode) {
			case 37:
				keydown.left = false;
				break;
			case 39:
				keydown.right = false;
				break;
			case 32:
				keydown.space = false;
				break;
			case 27:
				keydown.esc = false;
				break;
			default: break;
		}
		// e.preventDefault ? e.preventDefault() : (e.returnValue = false);
	});


	/* Game Config */
	var game = {
		level : 1,
		score : 0,
		started : false,
		paused : false,
		start : function(){
			/* Write out Level */
			document.querySelector('.level').innerHTML = this.level;
		},
		update : function(){
			/* Write out Score */
			document.querySelector('.score').innerHTML = this.score;

			ship.update(ctx);
		}
	};
	
	/* Canvas */
	var ctx = document.createElement('canvas').getContext('2d');
	ctx.canvas.width = 800;
	ctx.canvas.height = 600;
	ctx.canvas.classList.add('cnvs');
	document.querySelector('.cont').appendChild(ctx.canvas);
	
	ctx.clearScene = function(){
		this.fillStyle = "#000";
		this.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}
	ctx.render = function () {
		this.clearScene();

		ship.draw(this);
	};

	/* cxt FPS */
	ctx.frames = 10;
	ctx.prevFrameTick = +(new Date);
	ctx.diffStack = 0;
	ctx.diffFrameTick = 0;
	ctx.FPS = 0;
	ctx.getFPS = function(){
		this.frames--;
		var currFrameTick = +(new Date);
		this.diffFrameTick = currFrameTick - this.prevFrameTick;
		if (!this.frames) {
			this.diffStack += (this.diffFrameTick);
			this.FPS = Math.round(1000 / (this.diffStack / 10));
			this.frames = 10;
			this.diffStack = 0;
		}
		else {
			this.diffStack += this.diffFrameTick;
		}
		this.prevFrameTick = currFrameTick;
		return this.FPS;
	}

	/* Ship */
	var Ship = function (settings) {
		var settings = settings || {};
		this.color = settings.color || '#080';
		this.x = settings.x || 0;
		this.y = settings.y || 0;
		this.width = settings.width || 28;
		this.height = settings.height || 28;
		this.step = settings.step || 20;
		this.maxRocketStack = settings.maxRocketStack || 1;
		this.rocketStack = [];
		this.shoot = function(ctx) {
			if (this.rocketStack.length < this.maxRocketStack) {
				this.rocketStack.push(new Rocket({
					x : this.width / 2 + this.x - 2,
					y : this.y,
					width : 4,
					height : 16,
					vy : -(ctx.canvas.height * 1)
				}));
			};
		}
		this.draw = function(ctx) {
			this.rocketStack.forEach(function(rocket){
				rocket.draw(ctx);
			});
			ctx.fillStyle = this.color;
			ctx.fillRect(this.x, this.y, this.width, this.height);
		};
		this.update = function(ctx) {
			/* Motion of the ship  */
			if (keydown.left) {
				this.x -= (ctx.diffFrameTick / 1000) * this.step;
			}
			if (keydown.right) {
				this.x += (ctx.diffFrameTick / 1000) * this.step;
			}
			this.x = (Math.min(Math.max(this.x, 0), (ctx.canvas.width - this.width))).toFixed(4)*1;
			
			/* Ship shooting */
			if (keydown.space) {
				this.shoot(ctx);
			}

			this.rocketStack.forEach(function(rocket){
				rocket.update(ctx);
			});
			this.rocketStack = ship.rocketStack.filter(function(rocket){
				return rocket.active;
			});
		};
	};

	/* Create is new Ship */
	var ship = new Ship({
		color : '#f80',
		width : 40,
		height : 28,
		x : (ctx.canvas.width - 40) / 2,
		y : ctx.canvas.height - 28,
		step : ctx.canvas.width * .2
	});
	
	/* Rocket */
	var Rocket = function (settings) {
		this.active = true;
		this.color = settings.color || '#f00';
		this.width = settings.width || 4;
		this.height = settings.height || 8;
		this.x = settings.x || 0;
		this.y = settings.y || 0,
		this.vx = settings.vx || 0;
		this.vy = settings.vy || 0;
		this.inScene = function(ctx) {
			return this.x >= 0 && (this.x + this.width) <= ctx.canvas.width &&
					this.y >= 0 && (this.y + this.height) <= ctx.canvas.height;
		};
		this.draw = function(ctx){
			ctx.fillStyle = this.color;
			ctx.fillRect(this.x, this.y, this.width, this.height);
		};
		this.update = function(ctx){
			this.x += (ctx.diffFrameTick / 1000) * this.vx;
			this.y += (ctx.diffFrameTick / 1000) * this.vy;
			this.active = this.active && this.inScene(ctx);
		};
	};



	

	/* Main function of Game */
	(function run () {
		/* Write out FPS */
		document.querySelector('.fps').innerHTML = ctx.getFPS();

		/* Update States */
		game.update();
		ctx.render();
		requestAnimFrame(run);
	})();
});