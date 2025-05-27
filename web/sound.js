"use strict";
(() => {

class NullAudioEngine {
	constructor() {
		this.musicVol = 1;
		this.soundVol = 1;
		this.isNullAudio = true;
	}
	load(tag, oggFile, wavFile, simultaneousCount) {}
	loadMp3(tag, mp3File, simultaneousCount) {}
	loadMusic(tag, oggFile, wavFile) {}
	loadMp3Music (tag, mp3File) {}
	playMusic(tag) {}
	playOneShot(tag) {}
	playOneMusic(tag) {}
	stopMusic() {}
	getMusicVolume() { return this.musicVol; }
	getSfxVolume() { return this.soundVol; }
	setMusicVolume(vol) { this.musicVol = vol; }
	setSfxVolume(vol) { this.soundVol = vol; }

}

window.AudioInstance = new NullAudioEngine();
window.createAudioEngine = function()
{
	if (!window.AudioInstance.isNullAudio)
		return;
	if (HTML5AudioIsSupported())
	{
		AudioInstance = new HTML5AudioEngine();
	}
	else
		AudioInstance = new NullAudioEngine();
};

function HTML5AudioIsSupported()
{
	//	Check to see if we have HTML5 audio support with the API we expect
	//	(there might a slim chance that the API evolves to be different from
	//	what we expect)
	var hasAudio = true;
	try {
		var audiotest = new Audio();
		if (!audiotest.canPlayType) hasAudio = false;
		if (!audiotest.play) hasAudio = false;
		if (!audiotest.pause) hasAudio = false;
		if (audiotest.autoplay == undefined) hasAudio = false;
//		if (audiotest.autobuffer == undefined) hasAudio = false;
		if (audiotest.muted == undefined) hasAudio = false;
		if (audiotest.volume == undefined) hasAudio = false;
	} catch (e) {
		hasAudio = false;
	}
	return hasAudio;
};




//The audio manager might maintain multiple copies of the same sound effect, 
//if the sound effect will be triggered simultaneously multiple times
//(takes an array of sound clips)
class SoundFxClips
{
	constructor(clips) {
		this.clips = clips;
		this.index = 0;
	}
}

//Audio engine that uses HTML5 audio support to play stuff
class HTML5AudioEngine extends NullAudioEngine
{
	constructor() 	{
		super();
		this.musicClips = {};
		this.audioClips = {};
		this.musicPlaying = [];
		this.isNullAudio = true;
	}

	canPlayType (type)
	{
		var result = new Audio().canPlayType(type); 
		return result != "" && result != "no";
	}
	canOgg () 
	{
		return this.canPlayType("audio/ogg");
	};




	tryLoadClip (oggFile, mp3File, wavFile)
	{
		var clip = new Audio();
		clip.autoplay =false;
	//	clip.setAutobuffer(true);
		var canOgg = clip.canPlayType("audio/ogg");
		var canMp3 = clip.canPlayType("audio/mpeg");
		// Chrome uses audio/mp3 and not audio/mpeg to indicate mp3 support
		var canMp3Alt = clip.canPlayType("audio/mp3");  
		var canWav = clip.canPlayType("audio/wav");
		if (oggFile != null && canOgg)
			clip.src = oggFile;
		else if (mp3File != null && (canMp3 || canMp3Alt))
			clip.src = mp3File;
		else if (wavFile != null && canWav)
			clip.src = wavFile;
		else
			return null;
		return clip;
	};



	loadMp3(tag, mp3File, simultaneousCount)
	{
		if (this.audioClips[tag]) return;
		var clips = new Array(simultaneousCount);
		for (var n = 0; n < simultaneousCount; n++)
		{
			var clip = this.tryLoadClip(null, mp3File, null);
			if (clip == null) return;
			clip.volume = this.soundVol;
			clips[n] = clip;
		}
		var fx = new SoundFxClips(clips);
		this.audioClips[tag] = fx;
	}
	load (tag, oggFile, wavFile, simultaneousCount)
	{
		if (this.audioClips[tag]) return;
		var clips = new Array(simultaneousCount);
		for (var n = 0; n < simultaneousCount; n++)
		{
			var clip = this.tryLoadClip(oggFile, null, wavFile);
			if (clip == null) return;
			clip.volume = this.soundVol;
			clips[n] = clip;
		}
		var fx = new SoundFxClips(clips);
		this.audioClips[tag] = fx;
	};

	registerLoopHandler (clip, tag)
	{
		clip.addEventListener('ended', function() 
				{
			// Firefox 3.5 doesn't support loops, so we have to do it manually.
			// But their audio code isn't good enough to play a clip twice using 
			// JavaScript either (it hiccups), so we force a
			// small pause so that things hopefully reset
			// (No, that doesn't work. Neither does pausing and restarting, 
			// or seeking first--I'll just leave it).
			// Actually, the same thing happens with Chrome. Maybe there's
			// something funny with my files (or maybe with Ogg).
			// Tried adding two seconds of silence at the beginning of the sound--no help
			// I think there's something funny with my Ogg files or with the Ogg player
			window.setTimeout(function() {
				AudioInstance.replayMusicClip(tag);}, 0);
				}, true);
	};

	replayMusicClip (tag)
	{
		this.musicClips[tag].play();
	};

	loadMp3Music (tag, mp3File)
	{
		if (this.musicClips[tag]) return;
		var clip = this.tryLoadClip(null, mp3File, null);
		if (clip != null)
		{
			clip.volume = this.musicVol;
			this.musicClips[tag] = clip;
			this.registerLoopHandler(clip, tag);
		}
	};
	loadMusic (tag, oggFile, wavFile)
	{
		if (this.musicClips[tag]) return;
		var clip = this.tryLoadClip(oggFile, null, wavFile);
		if (clip != null)
		{
			clip.volume = this.musicVol;
			this.musicClips[tag] = clip;
			this.registerLoopHandler(clip, tag);
		}
	};
	playOneShot (tag)
	{
		if (!this.audioClips[tag]) return;
		var fx = this.audioClips[tag];
		fx.clips[fx.index].play();
		fx.index++;
		if (fx.index >= fx.clips.length)
			fx.index = 0;
	};

	playOneMusic (tag)
	{
		if (!this.musicClips[tag]) return;
		var clip = this.musicClips[tag];
		var isClipPlaying = false;
		for (var idx in this.musicPlaying) {
			if (clip != this.musicPlaying[idx])
				this.musicPlaying[idx].pause();
			else
				isClipPlaying = true;
		}
		if (!isClipPlaying)
			clip.play();
		this.musicPlaying = [clip];
	};

	playMusic (tag)
	{
		if (!this.musicClips[tag]) return;
		var clip = this.musicClips[tag];
		var isClipPlaying = false;
		for (var i = 0; i < this.musicPlaying.length; i++)
		{
			if (this.musicPlaying[i] == clip)
			{
				isClipPlaying = true;
				break;
			}
		}
		if (!isClipPlaying)
		{
			// I don't think you can play the same clip twice simultaneously,
			// but to be safe, I'll track what music is playing
			clip.play();
			this.musicPlaying.push(clip);
		}
	};
	stopMusic ()
	{
		for (var idx in this.musicClips)
			this.musicClips[idx].pause();
		this.musicPlaying.clear();
	};

	setMusicVolume (vol) 
	{ 
		if (vol < 0) vol = 0;
		if (vol > 1) vol = 1;
		this.musicVol = vol;
		for (var idx in this.musicClips)
			this.musicClips[idx].volume = vol;
	};
	setSfxVolume (vol) 
	{ 
		if (vol < 0) vol = 0;
		if (vol > 1) vol = 1;
		this.soundVol = vol; 
		for (var idx in this.audioClips)
		{
			var clips = this.audioClips[idx];
			for (var fxIdx in clips.clips)
				clips.clips[fxIdx].volume = vol;
		}
	};


}







})();