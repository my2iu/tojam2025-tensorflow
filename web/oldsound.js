

var AudioInstance = new NullAudioEngine();
function createAudioEngine()
{
	if (PhoneGapAudioIsSupported())
		AudioInstance = new PhoneGapAudioEngine();
	else if (HTML5AudioIsSupported())
	{
		AudioInstance = new HTML5AudioEngine();
		if (!AudioInstance.canPlayType("audio/ogg")
				&& !AudioInstance.canPlayType("audio/wav")
				&& WMPAudioIsSupported())
		{
			AudioInstance = new WMPAudioEngine();
		}
	}
	else if (WMPAudioIsSupported())
		AudioInstance = new WMPAudioEngine();
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

function PhoneGapAudioIsSupported()
{
	var hasAudio = true;
	try {
		if (!window.PhoneGap) return false;
	} catch (e) {
		hasAudio = false;
	}
	return hasAudio;
}

function WMPAudioIsSupported()
{
	var hasWmp = true;
	var player;
	try {
	   player = new ActiveXObject("WMPlayer.OCX.7");
	} catch (e) {hasWmp = false;}
	if (!hasWmp) return false;
	
	var tmp = document.createElement('div');
	tmp.innerHTML = '<OBJECT CLASSID="CLSID:6BF52A52-394A-11d3-B153-00C04F79FAA6"></OBJECT>';
	player = tmp.getElementsByTagName('OBJECT')[0];
	tmp = null;
	if (!player || !player.versionInfo) hasWmp = false;
	return hasWmp;
}

function NullAudioEngine()
{
	this.load = function(tag, oggFile, wavFile, simultaneousCount) {};
	this.loadMusic = function(tag, oggFile, wavFile) {};
	this.playMusic = function(tag) {};
	this.playOneShot = function(tag) {};
	this.playOneMusic = function(tag) {};
//	@Override public void setMute(boolean isMute) {}
	this.stopMusic = function() {};
	this.musicVol = 1;
	this.soundVol = 1;
	this.getMusicVolume = function() { return this.musicVol; };
	this.getSfxVolume = function() { return this.soundVol; };
	this.setMusicVolume = function(vol) { this.musicVol = vol; };
	this.setSfxVolume = function(vol) { this.soundVol = vol; };

}


//The audio manager might maintain multiple copies of the same sound effect, 
//if the sound effect will be triggered simultaneously multiple times
//(takes an array of sound clips)
function SoundFxClips(clips)
{
	this.clips = clips;
	this.index = 0;
}

//Audio engine that uses HTML5 audio support to play stuff
function HTML5AudioEngine()
{
	this.musicVol = 1;
	this.soundVol = 1;
	this.musicClips = {};
	this.audioClips = {};
	this.musicPlaying = [];

}
HTML5AudioEngine.prototype = new NullAudioEngine();

HTML5AudioEngine.prototype.canPlayType = function(type)
{
	var result = new Audio().canPlayType(type); 
	return result != "" && result != "no";
};
HTML5AudioEngine.prototype.canOgg = function() 
{
	return this.canPlayType("audio/ogg");
};




HTML5AudioEngine.prototype.tryLoadClip = function(oggFile, wavFile)
{
	var clip = new Audio();
	clip.autoplay =false;
//	clip.setAutobuffer(true);
	var canOgg = clip.canPlayType("audio/ogg");
//	var canMp3 = clip.canPlayType("audio/mpeg");
//	// Chrome uses audio/mp3 and not audio/mpeg to indicate mp3 support
//	var canMp3Alt = clip.canPlayType("audio/mp3");  
	var canWav = clip.canPlayType("audio/wav");
	if (oggFile != null && canOgg)
		clip.src = oggFile;
	else if (wavFile != null && canWav)
		clip.src = wavFile;
	else
		return null;
	return clip;
};



HTML5AudioEngine.prototype.load = function(tag, oggFile, wavFile, simultaneousCount)
{
	if (this.audioClips[tag]) return;
	var clips = new Array(simultaneousCount);
	for (var n = 0; n < simultaneousCount; n++)
	{
		var clip = this.tryLoadClip(oggFile, wavFile);
		if (clip == null) return;
		clip.volume = this.soundVol;
		clips[n] = clip;
	}
	var fx = new SoundFxClips(clips);
	this.audioClips[tag] = fx;
};

HTML5AudioEngine.prototype.registerLoopHandler = function(clip, tag)
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

HTML5AudioEngine.prototype.replayMusicClip = function(tag)
{
	this.musicClips[tag].play();
};

HTML5AudioEngine.prototype.loadMusic = function(tag, oggFile, wavFile)
{
	if (this.musicClips[tag]) return;
	var clip = this.tryLoadClip(oggFile, wavFile);
	if (clip != null)
	{
		clip.volume = this.musicVol;
		this.musicClips[tag] = clip;
		this.registerLoopHandler(clip, tag);
	}
};
HTML5AudioEngine.prototype.playOneShot = function(tag)
{
	if (!this.audioClips[tag]) return;
	var fx = this.audioClips[tag];
	fx.clips[fx.index].play();
	fx.index++;
	if (fx.index >= fx.clips.length)
		fx.index = 0;
};

HTML5AudioEngine.prototype.playOneMusic = function(tag)
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

HTML5AudioEngine.prototype.playMusic = function(tag)
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
HTML5AudioEngine.prototype.stopMusic = function()
{
	for (var idx in this.musicClips)
		this.musicClips[idx].pause();
	this.musicPlaying.clear();
};

HTML5AudioEngine.prototype.setMusicVolume = function(vol) 
{ 
	if (vol < 0) vol = 0;
	if (vol > 1) vol = 1;
	this.musicVol = vol;
	for (var idx in this.musicClips)
		this.musicClips[idx].volume = vol;
};
HTML5AudioEngine.prototype.setSfxVolume = function(vol) 
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



// WMP Audio Engine

//Audio engine that uses HTML5 audio support to play stuff
function WMPAudioEngine()
{
	var tmp = document.createElement('div');
	tmp.innerHTML = '<OBJECT CLASSID="CLSID:6BF52A52-394A-11d3-B153-00C04F79FAA6"></OBJECT>';
	this.player = tmp.getElementsByTagName('OBJECT')[0];
	tmp = null;
	this.player.settings.setMode("loop", true);
	
	this.musicVol = 1;
	this.musicClips = {};
	this.musicPlaying = null;
}
WMPAudioEngine.prototype = new NullAudioEngine();

WMPAudioEngine.prototype.loadMusic = function(tag, oggFile, wavFile)
{
	if (this.musicClips[tag]) return;
	this.musicClips[tag] = wavFile;
};

WMPAudioEngine.prototype.playOneMusic = function(tag)
{
	if (!this.musicClips[tag]) return;
	var clip = this.musicClips[tag];
	var isClipPlaying = (this.musicPlaying == clip);
	
	if (!isClipPlaying)
	{
		this.player.URL = clip;
		this.player.controls.play();
	}
	this.musicPlaying = clip;
};

WMPAudioEngine.prototype.playMusic = function(tag)
{
	this.playOneMusic(tag);
};
WMPAudioEngine.prototype.stopMusic = function()
{
	this.player.controls.stop();
	this.musicPlaying = null;
};

WMPAudioEngine.prototype.setMusicVolume = function(vol) 
{ 
	if (vol < 0) vol = 0;
	if (vol > 1) vol = 1;
	this.musicVol = vol;
	this.player.settings.volume = vol * 100;
};



// PhoneGap audio

function PhoneGapAudioEngine()
{
	this.musicVol = 1;
	this.soundVol = 1;
	this.musicClips = {};
	this.audioClips = {};
	this.musicPlaying = [];

}
PhoneGapAudioEngine.prototype = new NullAudioEngine();


PhoneGapAudioEngine.prototype.tryLoadClip = function(oggFile, wavFile)
{
	var clip = new Audio();
	clip.autoplay =false;
//	clip.setAutobuffer(true);
	var canOgg = clip.canPlayType("audio/ogg");
//	var canMp3 = clip.canPlayType("audio/mpeg");
//	// Chrome uses audio/mp3 and not audio/mpeg to indicate mp3 support
//	var canMp3Alt = clip.canPlayType("audio/mp3");  
	var canWav = clip.canPlayType("audio/wav");
	if (oggFile != null && canOgg)
		clip.src = oggFile;
	else if (wavFile != null && canWav)
		clip.src = wavFile;
	else
		return null;
	return clip;
};



PhoneGapAudioEngine.prototype.load = function(tag, oggFile, wavFile, simultaneousCount)
{
	if (this.audioClips[tag]) return;
	var clips = new Array(simultaneousCount);
	for (var n = 0; n < simultaneousCount; n++)
	{
		if (device.platform == 'Android') wavFile = '/android_asset/www/' + wavFile;
		var clip = new Media(wavFile);
//		if (clip == null) return;
//		clip.volume = this.soundVol;
		clips[n] = clip;
	}
	var fx = new SoundFxClips(clips);
	this.audioClips[tag] = fx;
};

//PhoneGapAudioEngine.prototype.registerLoopHandler = function(clip, tag)
//{
//	clip.addEventListener('ended', function() 
//			{
//		// Firefox 3.5 doesn't support loops, so we have to do it manually.
//		// But their audio code isn't good enough to play a clip twice using 
//		// JavaScript either (it hiccups), so we force a
//		// small pause so that things hopefully reset
//		// (No, that doesn't work. Neither does pausing and restarting, 
//		// or seeking first--I'll just leave it).
//		// Actually, the same thing happens with Chrome. Maybe there's
//		// something funny with my files (or maybe with Ogg).
//		// Tried adding two seconds of silence at the beginning of the sound--no help
//		// I think there's something funny with my Ogg files or with the Ogg player
//		window.setTimeout(function() {
//			AudioInstance.replayMusicClip(tag);}, 0);
//			}, true);
//};

//PhoneGapAudioEngine.prototype.replayMusicClip = function(tag)
//{
////	this.musicClips[tag].play();
//};

function PhoneGapReplayHandler()
{
	for (var i = 0; i < this.musicPlaying.length; i++)
	{
		this.musicPlaying[i].play();
	}
}

PhoneGapAudioEngine.prototype.loadMusic = function(tag, oggFile, wavFile)
{
	if (this.musicClips[tag]) return;
	if (device.platform == 'Android') wavFile = '/android_asset/www/' + wavFile;
	var clip = new Media(wavFile, PhoneGapReplayHandler);
//	var clip = newthis.tryLoadClip(oggFile, wavFile);
	if (clip != null)
	{
//		clip.volume = this.musicVol;
		this.musicClips[tag] = clip;
//		this.registerLoopHandler(clip, tag);
	}
};
PhoneGapAudioEngine.prototype.playOneShot = function(tag)
{
	if (!this.audioClips[tag]) return;
	var fx = this.audioClips[tag];
	fx.clips[fx.index].play();
	fx.index++;
	if (fx.index >= fx.clips.length)
		fx.index = 0;
};

PhoneGapAudioEngine.prototype.playMusic = function(tag)
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
PhoneGapAudioEngine.prototype.stopMusic = function()
{
	for (var idx in this.musicClips)
		this.musicClips[idx].pause();
	this.musicPlaying.clear();
};

PhoneGapAudioEngine.prototype.setMusicVolume = function(vol) 
{ 
	if (vol < 0) vol = 0;
	if (vol > 1) vol = 1;
	this.musicVol = vol;
//	for (var idx in this.musicClips)
//		this.musicClips[idx].volume = vol;
};
PhoneGapAudioEngine.prototype.setSfxVolume = function(vol) 
{ 
	if (vol < 0) vol = 0;
	if (vol > 1) vol = 1;
	this.soundVol = vol; 
	for (var idx in this.audioClips)
	{
		var clips = this.audioClips[idx];
//		for (var fxIdx in clips.clips)
//			clips.clips[fxIdx].volume = vol;
	}
};

