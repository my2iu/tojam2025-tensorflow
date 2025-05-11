"use strict";
(() => {

// Returns a game loop. Perhaps I should have a calibration level
// that makes the user stand in a T-pose to "power-on" the robot
// (like a magical robot transformation), then I can get measurements
// of different body parts
window.startLevel1 = function(gameData)
{
	let gameObjects = [];
	let totalTime = 0;
	gameObjects.push(new Tank(500, 320));
	gameObjects.push(new Tank(200, 335));
	
	return (ctx, deltaTime, pose) => {
		totalTime += deltaTime;
		
		// Draw a background
		ctx.fillStyle = '#c2e6fc';
		ctx.fillRect(0, 0, 640, 200);
		ctx.fillStyle = '#66cc00';
		ctx.fillRect(0, 200, 640, 160);
		
		
		// Simulate other objects
		for (let obj of gameObjects) {
			obj.run(deltaTime, totalTime, pose);
		}

		// Remove dead objects
		gameObjects = gameObjects.filter(obj => !obj.isDead);

		// We have a valid pose, so draw the robot
		drawRobot(pose);

		// display other objects
		for (let obj of gameObjects) {
			obj.render(ctx);
		}
	};
}


class GameObject
{
	constructor() {
		this.isDead = false;
	}
	run(deltaTime, elapsedTime, pose) {
	}
	render(ctx) {
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
	render(ctx) {
		this.sprite.draw(ctx, this.x, this.y);
	}
}

class Tank extends SpriteObject
{
	constructor(x, y) {
		super(TankSprite, x, y);
	}
	run(deltaTime, elapsedTime, pose) {
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

})();