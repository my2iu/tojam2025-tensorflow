"use strict";
(() => {

// Returns a game loop. Perhaps I should have a calibration level
// that makes the user stand in a T-pose to "power-on" the robot
// (like a magical robot transformation), then I can get measurements
// of different body parts
window.startLevel1 = function(gameData)
{
	let gameObjects = [];
	return (ctx, deltaTime, pose) => {
		// Draw a background
		ctx.fillStyle = '#c2e6fc';
		ctx.fillRect(0, 0, 640, 200);
		ctx.fillStyle = '#66cc00';
		ctx.fillRect(0, 200, 640, 160);
		
		// We have a valid pose, so draw the robot
		drawRobot(pose);

	};
}


class GameObject
{
	run(deltaTime, elapsedTime) {
	}
	render(ctx) {
	}
}

class SpriteObject extends GameObject
{
	constructor(sprite, x, y) {
		this.x = x;
		this.y = y;
		this.sprite = sprite;
	}
	render(ctx) {
		this.sprite.draw(ctx, x, y);
	}
}

class Tank extends SpriteObject
{
	constructor(x, y) {
		super(TankSprite, x, y);
	}
	run(deltaTime, elapsedTime) {
	}
	render(ctx) {
		
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

let TankSprite = new Sprite('imgs/tank.png', 0, 0);


})();