window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame    || 
			window.webkitRequestAnimationFrame  || 
			window.mozRequestAnimationFrame   || 
			window.oRequestAnimationFrame   || 
			window.msRequestAnimationFrame    || 
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
	var keyItr = true;
	var game = {
		level : 5,
		score : 0,
		started : false,
		paused : false,
		start : function(){
			/* Write out Level */
			scene.innerHTML = '';
			document.querySelector('.level').innerHTML = this.level;

			if(ship.iam) {
				scene.appendChild(ship.iam);
			}
			else {
				ship.x = scene.SCENE_WIDTH / 2 - ship.width / 2;
				ship.y = scene.SCENE_HEIGHT - ship.height;
			}

			mobsGroup.create();

			this.started = true;
		},
		update : function(){
			/* Pause Game */
			if (keydown.esc) {
				if(keyItr) {
					if (this.paused) {
						this.paused = false;
					}
					else {
						this.paused = true;
					};
					keyItr = false;
				}
			}
			else {
				keyItr = true;
			}


			if (!this.paused) {
				/* Motion of the ship  */
				if (keydown.left) {
					ship.x -= (performance.diffFrameTick / 1000) * ship.step;
				}
				if (keydown.right) {
					ship.x += (performance.diffFrameTick / 1000) * ship.step;
				}
				ship.x = (Math.min(Math.max(ship.x, 0), (scene.SCENE_WIDTH - ship.width))).toFixed(4)*1;
				
				/* Ship shooting */
				if (keydown.space) {
					ship.shoot();
				}
				
				ship.rocketStack.forEach(function(rocket){
					rocket.update();
				});
				ship.rocketStack = ship.rocketStack.filter(function(rocket){
					if(!rocket.active) {
						rocket.iam.parentNode.removeChild(rocket.iam);
					}
					return rocket.active;
				});

				/* Update Mobs */
				if(!mobsGroup.mobsStack.length) {
					this.level++;
					this.start();
				}
				mobsGroup.mobsStack.forEach(function(mob) {
					mob.update();
				});

				mobsGroup.mobsStack = mobsGroup.mobsStack.filter(function(mob) {
					if(!mob.active) {
						mob.iam.parentNode.removeChild(mob.iam);
					}
					return mob.active;
				});

				handleCollisions();
			}
		}
	};
	
	/* Scent Config */
	var scene = document.querySelector('.scene');
	scene.SCENE_WIDTH = 800;
	scene.SCENE_HEIGHT = 600;
	scene.render = function () {
		/* Clear Scene */
		
		ship.draw();

		mobsGroup.mobsStack.forEach(function(mob) {
			mob.draw();
		});

		ship.rocketStack.forEach(function(rocket){
			rocket.draw();
		});
		
	};

	/* Ship scene */
	var ship = {
		skin : "img/sprite.png",
		color : "#0a0",
		width : 48,
		height : 48,
		x : 0,
		y : 0,
		iam : false,
		maxRocketStack : 1,
		rocketStack : [],
		shoot : function(){
			if (this.rocketStack.length < this.maxRocketStack) {
				var gunPos = this.gun();
				this.rocketStack.push(Rocket({
					parent : this,
					color : '#f00',
					x : gunPos.x,
					y : gunPos.y,
					speed : 1
				}));
			};
		},
		gun : function(){
			return {
				x: this.x + this.width/2,
				y: this.y
			};
		},
		step : scene.SCENE_WIDTH * 0.2, // Distance per second (20% of SCENE_WIDTH)
		draw : function(){
			if (!this.iam) {
				this.iam = document.createElement('div');
				this.iam.className = "ship";
				this.iam.id = "ship";
				this.iam.style.background = 'url(' + this.skin + ') no-repeat 0 0 ' + this.color;
				scene.appendChild(this.iam);
			};
			this.iam.style.top = this.y + 'px';
			this.iam.style.left = this.x + 'px';
		}
	};
	

	/* Rocket Constructor */
	function Rocket(o) {
		return {
			parent : o.parent,
			active : true,
			color : o.color,
			width : 4,
			height : 8,
			x : o.x,
			y : o.y,
			xDir : 0,
			yDir : -(scene.SCENE_HEIGHT * o.speed),
			iam : false,
			inScene : function() {
				return this.x >= 0 && (this.x + this.width) <= scene.SCENE_WIDTH &&
						this.y >= 0 && (this.y + this.height) <= scene.SCENE_HEIGHT;
			},
			draw : function(){
				if (!this.iam) {
					this.iam = document.createElement('div');
					this.iam.className = "shell";
					this.iam.id = "shell";
					this.iam.style.background = this.color;
					this.iam.style.width = this.width;
					this.iam.style.height = this.height;
					scene.appendChild(this.iam);
				};
				this.iam.style.top = this.y + 'px';
				this.iam.style.left = (this.x - this.width/2) + 'px';
			},
			update : function(){
				this.x += (performance.diffFrameTick / 1000) * this.xDir,
				this.y += (performance.diffFrameTick / 1000) * this.yDir
				this.active = this.active && this.inScene();
			}
		};
	}

	function collides(a, b) {
		return a.x < b.x + b.width &&
			a.x + a.width > b.x &&
			a.y < b.y + b.height &&
			a.y + a.height > b.y;
	}
	function handleCollisions() {
		ship.rocketStack.forEach(function(rocket) {
			mobsGroup.mobsStack.forEach(function(mob) {
				if (collides(rocket, mob)) {
					mob.explode();
					rocket.active = false;
				}
			});
		});

		mobsGroup.mobsStack.forEach(function(mob) {
			if (collides(mob, ship)) {
				game.paused = true;
			}
		});
	}
	/* Mobs Constrictor */
	var mobsGroup = {
		col : 11,
		row : 5,
		margin : 5,
		mobXDir : 0,
		mobYDir : 0,
		step : 48,
		startX : 0,
		mobsStack : [],
		create : function() {
			this.startX = (scene.SCENE_WIDTH - (this.col * (this.step + this.margin))) * 0.5;
			this.mobXDir = scene.SCENE_WIDTH * 0.005;
			this.mobYDir = scene.SCENE_HEIGHT * 0.005;
			for (var i = 0; i < (game.level - 1); i++) {
				this.mobXDir += this.mobXDir * 0.5;
				this.mobYDir += this.mobYDir * 0.5;
			};
			for (var i = 0; i < this.col * this.row; i++) {
				switch(i%this.row) {
					case 0:
						var tmpType = 3;
						break;
					case 1:
						var tmpType = 3;
						break;
					case 2:
						var tmpType = 2;
						break;
					case 3:
						var tmpType = 2;
						break;
					case 4:
						var tmpType = 1;
						break;
					default: var tmpType = 1;
				}
				this.mobsStack.push(Mob({
					color : "#080",
					pos : i,
					x : this.startX + (this.step + this.margin) * (i%this.col),
					y : 10 + (this.step + this.margin) * (i%this.row),
					type : tmpType,
					xDir : this.mobXDir,
					yDir : this.mobYDir
				}));
			};
		}
	};
	function Mob(o) {
		return {
			active : true,
			color : o.color,
			width : 48,
			height : 48,
			pos : o.pos,
			x : o.x,
			y : o.y,
			skin : "img/sprite.png",
			type : o.type,
			xDir : o.xDir,
			yDir : o.yDir,
			iam : false,
			switched : false,
			animFrame : 2,
			animItr : 0,
			frameTickStack : 0,
			explode : function(){
				game.score += 10 * this.type;
				this.active = false;
			},
			switchDir : function(){
				this.xDir = -this.xDir;
				this.switched = true;
			},
			inScene : function () {
				if (this.x < 0) {
					var x = -1;
				}
				else if((this.x + this.width) > scene.SCENE_WIDTH) {
					var x = 1;
				}
				else {
					var x = 0;
				};

				if (this.y < 0) {
					var y = -1;
				}
				else if((this.y + this.height) > scene.SCENE_HEIGHT) {
					var y = 1;
				}
				else {
					var y = 0;
				};
				return {
					x : x,
					y : y
				};
			},
			draw : function () {
				var bgPosX;
				var bgPosY = -(this.height * this.animItr);
				if (this.frameTickStack > 1000) {
					this.frameTickStack = 0;
					this.animItr = (this.animItr < this.animFrame - 1) ? this.animItr + 1 : 0;
				}
				else {
					this.frameTickStack += performance.diffFrameTick;
				};
				switch(this.type) {
					case 1:
						bgPosX = -96;
						break;
					case 2:
						bgPosX = -48;
						break;
					case 3:
						bgPosX = -144;
						break;
					default: bgPosX = -96;
				}
				if (!this.iam) {
					this.iam = document.createElement('div');
					this.iam.className = "bug";
					this.iam.id = "bug";
					this.iam.style.width = this.width;
					this.iam.style.height = this.height;
					scene.appendChild(this.iam);
				};
				this.iam.style.background = 'url(' + this.skin + ') no-repeat ' + bgPosX + 'px ' + bgPosY + 'px ' + this.color;
				this.iam.style.top = this.y + 'px';
				this.iam.style.left = this.x + 'px';
			},
			update : function () {
				if (this.inScene().x && !this.switched) {
					mobsGroup.mobsStack.forEach(function(mob) {
						mob.y += mob.yDir;
						mob.switchDir();
					});
				};
				this.switched = false;
				this.x += (performance.diffFrameTick / 1000) * this.xDir;
				this.active = this.active;
			}
		};
	}


	/* Calc FPS */
	var performance = {
		frames : 10,
		prevFrameTick : +(new Date),
		diffStack : 0,
		diffFrameTick : 0,
		FPS : 0,
		getFPS : function(){
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
	};

	/* Main function of Game */
	(function run () {
		/* Write out FPS */
		document.querySelector('.fps').innerHTML = performance.getFPS();

		/* Write out Score */
		document.querySelector('.score').innerHTML = game.score;

		if (!game.started) {
			game.start();
		};
		/* Update States */
		game.update();
		scene.render();
		requestAnimFrame(run);
	})();
});