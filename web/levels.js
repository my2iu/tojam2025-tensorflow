"use strict";
(() => {

// Returns a game loop. Perhaps I should have a calibration level
// that makes the user stand in a T-pose to "power-on" the robot
// (like a magical robot transformation), then I can get measurements
// of different body parts
function startLevel1(gameData)
{ 
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	level.gameObjects.push(new Tank(500, 320));
	level.gameObjects.push(new TreeObject(70, 325));
	level.gameObjects.push(new TreeObject(560, 210));
	level.gameObjects.push(new TreeObject(600, 350));
	level.gameObjects.push(level.player);
	level.numEnemies = 1;
	level.nextLevel = startLevel2;
	
	return makeStandardGameLoopForLevel(level);
}
window.startLevel1 = startLevel1;

function startLevel2(gameData)
{
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	AudioInstance.loadMp3('littleExplosion', 'audio/Boom29.mp3', 3);
	AudioInstance.loadMp3('shoot', 'audio/shoot.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	level.gameObjects.push(new Tank(0, 0).scheduleMove(500, 700, 320, 500));
	level.gameObjects.push(new Tank(0, 0).scheduleMove(1500, 700, 230, 450));
	level.gameObjects.push(new Tank(0, 0).scheduleMove(3500, 700, 350, 200));
	level.gameObjects.push(new TreeObject(230, 270));
	level.gameObjects.push(new TreeObject(550, 230));
	level.gameObjects.push(level.player);
	level.numEnemies = 3;
	level.nextLevel = startLevel3;
	
	return makeStandardGameLoopForLevel(level);
}
window.startLevel2 = startLevel2;

function startLevel3(gameData)
{
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	AudioInstance.loadMp3('littleExplosion', 'audio/Boom29.mp3', 3);
	AudioInstance.loadMp3('shoot', 'audio/shoot.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	level.gameObjects.push(new Tank(0, 0).scheduleMove(1500, 700, 320, 500).shootFrequency(2000));
	level.gameObjects.push(new Tank(0, 0).scheduleMove(500, -50, 260, 200).shootFrequency(1500));
	level.gameObjects.push(new TreeObject(230, 270));
	level.gameObjects.push(new TreeObject(550, 230));
	level.gameObjects.push(level.player);
	level.numEnemies = 2;
	level.nextLevel = startLevel4;
	
	return makeStandardGameLoopForLevel(level);
}
window.startLevel3 = startLevel3;

function startLevel4(gameData)
{
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	AudioInstance.loadMp3('littleExplosion', 'audio/Boom29.mp3', 3);
	AudioInstance.loadMp3('shoot', 'audio/shoot.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	level.gameObjects.push(new Ufo(50, 50).shootFrequency(2000));
	level.gameObjects.push(new TreeObject(230, 270));
	level.gameObjects.push(new TreeObject(550, 230));
	level.gameObjects.push(level.player);
	level.numEnemies = 1;
	level.nextLevel = startLevel5;
	
	return makeStandardGameLoopForLevel(level);
}
window.startLevel4 = startLevel4;

function startLevel5(gameData)
{
	AudioInstance.loadMp3('bigExplosion', 'audio/Boom9.mp3', 3);
	AudioInstance.loadMp3('littleExplosion', 'audio/Boom29.mp3', 3);
	AudioInstance.loadMp3('shoot', 'audio/shoot.mp3', 3);
	let level = new LevelState();
	level.player = new RobotPlayer();
	if (Math.random() > 0.5)
		level.gameObjects.push(new Ufo(700 , Math.random() * 300).shootFrequency(2000));
	else
		level.gameObjects.push(new Ufo(-50 , Math.random() * 300).shootFrequency(2000));
	level.gameObjects.push(new Tank(0, 0).scheduleMove(Math.random() * 3000, 700, Math.random() * 160 + 200, 500).shootFrequency(2000));
	level.gameObjects.push(new Tank(0, 0).scheduleMove(Math.random() * 3000, -50, Math.random() * 160 + 200, 500).shootFrequency(1500));
	level.gameObjects.push(new TreeObject(230, 270));
	level.gameObjects.push(new TreeObject(550, 230));
	level.gameObjects.push(level.player);
	level.numEnemies = 3;
	level.nextLevel = startLevel5;
	
	return makeStandardGameLoopForLevel(level);
}
window.startLevel5 = startLevel5;


function makeStandardGameLoopForLevel(level)
{
	let totalTime = 0;
	let isOver = false;
	return (ctx, deltaTime, pose, gameData) => {
		totalTime += deltaTime;
		
		// Draw a background
		ctx.fillStyle = '#c2e6fc';
		ctx.fillRect(0, 0, 640, 200);
		ctx.fillStyle = '#66cc00';
		ctx.fillRect(0, 200, 640, 160);
		
		
		if (!isOver)
		{
			// Simulate other objects
			level.run(deltaTime, totalTime, pose);

			// Remove dead objects
			level.removeDeadObjects();
		}

		// Render everything
		level.render(ctx);
		
		// Check if the level is over and we should transition
		if (level.endLevelTime >= 0 && totalTime > level.endLevelTime
			&& level.nextLevel)
		{
			gameData.nextGameLoop = level.nextLevel;
			isOver = true;
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
		// Sort the objects so that objects in back are drawn first
		this.gameObjects.sort((a, b) =>  a.sortY() < b.sortY());
		
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
	sortY() { return 0; }
	run(deltaTime, elapsedTime, level, pose) {
	}
	render(ctx, level) {
	}
	checkHit(x, y, tankX, tankY, width, height) {
		if (Math.abs(x - tankX) > 20 + width) 
			return false;
		if (y - tankY < height && y - tankY > -20 - height)
			return true;
		return false;
	}
	checkPunchOrKick(pose, width, height) {
		// Object should die if it is stepped on or punched
		// Use an area of 20 pixels around the hand or feet
		// Plus 50 pixels horizontally and 20 pixels vertically for hitbox
		if (this.checkHit(pose.l.wrist.x, pose.l.wrist.y, this.x, this.y, width, height)
			|| this.checkHit(pose.r.wrist.x, pose.r.wrist.y, this.x, this.y, width, height)
			|| this.checkHit(pose.l.ankle.x, pose.l.ankle.y, this.x, this.y, width, height)
			|| this.checkHit(pose.r.ankle.x, pose.r.ankle.y, this.x, this.y, width, height))
				return true;
		return false;
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
	sortY() { return this.y; }
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
	sortY() { return this.y; }
	render(ctx, level) {
		this.sprite.draw(ctx, this.x, this.y);
	}
}

class TreeObject extends SpriteObject
{
	constructor(x, y) {
		super(TreeSprite, x, y);
		this.isTrunk = false;
	}
	run(deltaTime, elapsedTime, level, pose) {
		// Object should die if it is stepped on or punched
		if (!this.isTrunk && this.checkPunchOrKick(pose, 22, 50)) {
			this.isTrunk = true;
		}
	}
	render(ctx, level) {
		if (!this.isTrunk)
			this.sprite.draw(ctx, this.x, this.y);
		else
			TrunkSprite.draw(ctx, this.x, this.y);
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
		this.shootEvery = 10000000;
		this.lastShot = 0;
	}
	scheduleMove(time, x, y, destX) {
		this.startTime = time;
		this.x = x;
		this.y = y;
		this.destX = destX;
		return this;
	}
	shootFrequency(time)
	{
		this.shootEvery = time;
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
		if (this.checkPunchOrKick(pose, 50, 20)) {
				AudioInstance.playOneShot('bigExplosion');
				this.explosionStart = elapsedTime;
				return;
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
			
			if (this.shootEvery < elapsedTime - this.lastShot - this.startTime)
			{
				let angle = -Math.PI / 4;
				if (this.facing > 0)
					angle = -3 * Math.PI / 4;
				level.gameObjects.push(new Bullet(this.x, this.y-20, angle));
				this.lastShot = elapsedTime;
				AudioInstance.playOneShot('shoot');
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

class Ufo extends SpriteObject
{
	constructor(x, y) {
		super(UfoSprite, x, y);
		this.explosionStart = -1;
		this.destX = x;
		this.destY = y;
		this.shootEvery = 10000000;
		this.lastShot = 0;
	}
	shootFrequency(time)
	{
		this.shootEvery = time;
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
		if (this.checkPunchOrKick(pose, 50, 20)) {
				AudioInstance.playOneShot('bigExplosion');
				this.explosionStart = elapsedTime;
				return;
		}
		
		// Do any movement
		const MOVE_RATE = 0.1;
		let deltaX = deltaTime * MOVE_RATE;
		let distToMove = this.length(this.destX - this.x, this.destY - this.y);
		if (deltaX > distToMove)
		{
			deltaX = Math.abs(this.x - this.destX);
			this.destX = Math.random() * 640;
			this.destY = Math.random() * 300;
		}
		let angle = Math.atan2(this.destY - this.y, this.destX - this.x);
		this.x += deltaX * Math.cos(angle);
		this.y += deltaX * Math.sin(angle);
		
		if (this.shootEvery < elapsedTime - this.lastShot)
		{
			let angle = Math.atan2((pose.l.hip.y + pose.l.shoulder.y) / 2 - this.y,
			(pose.l.hip.x + pose.l.shoulder.x) / 2 - this.x);
			level.gameObjects.push(new Bullet(this.x, this.y-20, angle));
			this.lastShot = elapsedTime;
			AudioInstance.playOneShot('shoot');
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
	length(dx, dy) {
		return Math.sqrt(dx * dx + dy * dy);
	}

}

class Bullet extends SpriteObject
{
	constructor(x, y, angle) {
		super(BulletSprite, x, y);
		this.angle = angle;
		this.forcedY = 500;
		this.explosionStart = -1;
	}
	sortY() { return this.forcedY; }
	run(deltaTime, elapsedTime, level, pose) {
		if (this.explosionStart >= 0)
		{
			if (elapsedTime - this.explosionStart > 300)
			{
				this.isDead = true;
			}
			return;
		}

		// Object should die if it is stepped on or punched
		// Use an area of 20 pixels around the hand or feet
		// Plus 50 pixels horizontally and 20 pixels vertically for hitbox
		let collision = projectPointToLineSegment(
			(pose.l.hip.x + pose.r.hip.x) / 2,
			(pose.l.hip.y + pose.r.hip.y) / 2,
			(pose.l.shoulder.x + pose.r.shoulder.x) / 2,
			(pose.l.shoulder.y + pose.r.shoulder.y) / 2,
			this.x, this.y);
		if (Math.abs(collision.perpendicular) < 20 && 
			collision.parallelRelative > 0 && collision.parallelRelative < 1)
		{
				AudioInstance.playOneShot('littleExplosion');
				this.explosionStart = elapsedTime;
				return;
		}
		
		const MOVE_RATE = 0.15;
		this.x += Math.cos(this.angle) * MOVE_RATE * deltaTime;
		this.y += Math.sin(this.angle) * MOVE_RATE * deltaTime;
		
		if (this.x < -100 || this.y < -100 || this.x > 700 || this.y > 400)
			this.isDead = true;
	}
	render(ctx, level) {
		if (this.explosionStart < 0)
			this.sprite.draw(ctx, this.x, this.y);
		else
			ExplosionSprite.draw(ctx, this.x, this.y);
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
let TrunkSprite = new Sprite('imgs/trunk.png', 16, 8);
let BulletSprite = new Sprite('imgs/bullet.png', 4, 4);
let ExplosionSprite = new Sprite('imgs/kenneyExplosion00-20.webp', 10, 9);
let BigExplosionSprite = new Sprite('imgs/kenneyExplosion06-100.webp', 50, 67);

})();