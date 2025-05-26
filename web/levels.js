"use strict";
(() => {

// Returns a game loop. Perhaps I should have a calibration level
// that makes the user stand in a T-pose to "power-on" the robot
// (like a magical robot transformation), then I can get measurements
// of different body parts
window.startLevel1 = function(gameData)
{
	let level = new LevelState();
	let totalTime = 0;
	level.player = new RobotPlayer();
	level.gameObjects.push(new Tank(500, 320));
	level.gameObjects.push(new Tank(200, 335));
	level.gameObjects.push(level.player);
	
	return (ctx, deltaTime, pose) => {
		totalTime += deltaTime;
		
		// Draw a background
		ctx.fillStyle = '#c2e6fc';
		ctx.fillRect(0, 0, 640, 200);
		ctx.fillStyle = '#66cc00';
		ctx.fillRect(0, 200, 640, 160);
		
		
		// Simulate other objects
		level.run(deltaTime, totalTime, pose);

		// Remove dead objects
		level.removeDeadObjects();

		level.render(ctx);
	};
}

class LevelState
{
	constructor() {
		this.gameObjects = [];
		this.player = null;
		this.sprites = {};
	}
	removeDeadObjects() {
		this.gameObjects = this.gameObjects.filter(obj => !obj.isDead);
	}
	run(deltaTime, totalTime, pose) {
		for (let obj of this.gameObjects) {
			obj.run(deltaTime, totalTime, this, pose);
		}
	}
	render(ctx) {
		// display other objects
		for (let obj of this.gameObjects) {
			obj.render(ctx, this);
		}
	}
}

class GameObject
{
	constructor() {
		this.isDead = false;
	}
	run(deltaTime, elapsedTime, level, pose) {
	}
	render(ctx, level) {
	}
}

class RobotPlayer extends GameObject
{
	constructor() {
		super();
		this.pose = null;
		this.x = 0;
		this.y = 0;
	}
	run(deltaTime, elapsedTime, level, pose) {
		this.pose = pose;
		// Set the x and y position based on the foot that's closest
		// to the bottom of the screen (less likely to be a raised foot)
		if (this.pose.r.ankle.y > this.pose.l.ankle.y) {
			this.x = this.pose.r.ankle.x;
			this.y = this.pose.r.ankle.y;
		} else {
			this.x = this.pose.l.ankle.x;
			this.y = this.pose.l.ankle.y;
		}
	}
	render(ctx, level) {
		if (this.pose != null)
			drawRobot(this.pose);
	}
}

class SpriteObject extends GameObject
{
	constructor(sprite, x, y) {
		super();
		this.x = x;
		this.y = y;
		this.sprite = sprite;
	}
	render(ctx, level) {
		this.sprite.draw(ctx, this.x, this.y);
	}
}

class Tank extends SpriteObject
{
	constructor(x, y) {
		super(TankSprite, x, y);
	}
	run(deltaTime, elapsedTime, level, pose) {
		// Object should die if it is stepped on or punched
		// Use an area of 20 pixels around the hand or feet
		// Plus 50 pixels horizontally and 20 pixels vertically for hitbox
		if (checkHit(pose.l.wrist.x, pose.l.wrist.y, this.x, this.y)
			|| checkHit(pose.r.wrist.x, pose.r.wrist.y, this.x, this.y)
			|| checkHit(pose.l.ankle.x, pose.l.ankle.y, this.x, this.y)
			|| checkHit(pose.r.ankle.x, pose.r.ankle.y, this.x, this.y)) {
				this.isDead = true;
		}
		
		function checkHit(x, y, tankX, tankY) {
			if (Math.abs(x - tankX) > 20 + 50) 
				return false;
			if (y - tankY < 20 && y - tankY > -20 - 20)
				return true;
			return false;
		}
	}
}


class Sprite
{
	constructor(file, originX, originY) {
		this.file = file;
		this.origin = { x: originX, y: originY };
		this.ready = false;
		this.width = 0;
		this.height = 0;
		this.img = new Image();
		this.img.onload = () => {
			this.width = this.img.width;
			this.height = this.img.height;
			this.ready = true;
		};
		this.img.src = file;
	}
	draw(ctx, x, y)
	{
		if (!this.ready) return;
		ctx.drawImage(this.img, x - this.origin.x, y - this.origin.y);
	}
}

let TankSprite = new Sprite('imgs/tank.png', 58, 35); // w:108, h:36
let UfoSprite = new Sprite('imgs/ufo.png', 43, 15); // w:86, h:28
let TreeSprite = new Sprite('imgs/tree.png', 18, 50);
let TrunkSprite = new Sprite('imgs/tree.png', 16, 8);
let BulletSprite = new Sprite('imgs/bullet.png', 4, 4);
let ExplosionSprite = new Sprite('imgs/kenneyExplosion00-20.webp', 10, 9);
let BigExplosionSprite = new Sprite('imgs/kenneyExplosion06-100.webp', 50, 67);

})();