"use strict";
(() => {

// Returns a game loop. Perhaps I should have a calibration level
// that makes the user stand in a T-pose to "power-on" the robot
// (like a magical robot transformation), then I can get measurements
// of different body parts
window.startLevel1 = function(gameData)
{ 
	//AudioInstance.loadMp3('bigExplosion', 'audio/Boom29.mp3', 3);
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	level.gameObjects.push(new Tank(500, 320).scheduleMove(3000, 640, 320, 500));
	level.gameObjects.push(new Tank(200, 335));
	level.gameObjects.push(level.player);
	level.numEnemies = 2;
	level.nextLevel = startLevel1;
	
	return makeStandardGameLoopForLevel(level);
}

window.startLevel2 = function(gameData)
{
}

function makeStandardGameLoopForLevel(level)
{
	let totalTime = 0;
	return (ctx, deltaTime, pose, gameData) => {
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

		// Render everything
		level.render(ctx);
		
		// Check if the level is over and we should transition
		if (level.endLevelTime >= 0 && totalTime > level.endLevelTime
			&& level.nextLevel)
		{
			gameData.nextGameLoop = level.nextLevel;
		}
	};
}

class LevelState
{
	constructor() {
		this.gameObjects = [];
		this.player = null;
		this.sprites = {};
		this.numEnemies = 0;
		this.endLevelTime = -1;
		this.nextLevel = null;
	}
	removeDeadObjects() {
		this.gameObjects = this.gameObjects.filter(obj => !obj.isDead);
	}
	run(deltaTime, totalTime, pose) {
		for (let obj of this.gameObjects) {
			obj.run(deltaTime, totalTime, this, pose);
		}
		if (this.numEnemies == 0 && this.endLevelTime < 0)
			this.endLevelTime = totalTime + 1500;
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
		this.facing = 1;
		this.explosionStart = -1;
		this.startTime = 0;
		this.destX = x;
	}
	scheduleMove(time, x, y, destX) {
		this.startTime = time;
		this.x = x;
		this.y = y;
		this.destX = destX;
		return this;
	}
	run(deltaTime, elapsedTime, level, pose) {
		if (this.explosionStart >= 0)
		{
			if (elapsedTime - this.explosionStart > 300)
			{
				this.isDead = true;
				level.numEnemies--;
			}
			return;
		}

		// Object should die if it is stepped on or punched
		// Use an area of 20 pixels around the hand or feet
		// Plus 50 pixels horizontally and 20 pixels vertically for hitbox
		if (checkHit(pose.l.wrist.x, pose.l.wrist.y, this.x, this.y)
			|| checkHit(pose.r.wrist.x, pose.r.wrist.y, this.x, this.y)
			|| checkHit(pose.l.ankle.x, pose.l.ankle.y, this.x, this.y)
			|| checkHit(pose.r.ankle.x, pose.r.ankle.y, this.x, this.y)) {
				AudioInstance.playOneShot('bigExplosion');
				this.explosionStart = elapsedTime;
				return;
		}
		
		function checkHit(x, y, tankX, tankY) {
			if (Math.abs(x - tankX) > 20 + 50) 
				return false;
			if (y - tankY < 20 && y - tankY > -20 - 20)
				return true;
			return false;
		}
		
		// Do any movement
		if (elapsedTime > this.startTime)
		{
			if (this.x != this.destX)
			{
				const MOVE_RATE = 0.05;
				let deltaX = deltaTime * MOVE_RATE;
				if (deltaX > Math.abs(this.x - this.destX))
					deltaX = Math.abs(this.x - this.destX);
				if (this.x < this.destX)
					this.x += deltaX;
				else
					this.x -= deltaX;
			}
		}
		
		// Adjust facing to face the player		
		this.facing = (level.player.x < this.x ? 1 : -1);
	}
	render(ctx, level) {
		if (this.explosionStart < 0)
			this.sprite.drawScaled(ctx, this.x, this.y, this.facing, 1);
		else
			BigExplosionSprite.draw(ctx, this.x, this.y);
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
	drawScaled(ctx, x, y, xScale, yScale)
	{
		if (!this.ready) return;
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(xScale, yScale);
		ctx.translate(-this.origin.x, -this.origin.y);
		ctx.drawImage(this.img, 0, 0);
		ctx.restore();
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