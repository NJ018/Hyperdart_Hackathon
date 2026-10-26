import pkg from './package.json' with {type:'json'}

export default  {
	// import name from package.json
	name: pkg.name,
	triggers: {
		keywords: [
			// provided by the organisers
			'weather alerts', 'weather alert', 'weather warnings', 'weather warning', 'severe weather',
			'tornado warning', 'flood warning', 'heat advisory', 'winter storm warning', 'safety alerts',
			// our additions
			'flash flood warning', 'hurricane warning', 'red flag warning', 'air quality alert',
			'storm warning', 'blizzard warning', 'extreme heat warning', 'alerts near me'
		]
		// in the future, we can add other types of triggers
	},
	query_format: {
		regex: [
			// provided by the organisers (verbatim)
			'(weather|severe\\s+weather|safety|emergency)\\s+(alerts?|warnings?|advisories)\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			'(tornado|flood|flash\\s+flood|heat|winter\\s+storm|storm|wind|fire\\s+weather|hurricane|air\\s+quality)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			'is\\s+there\\s+(a|an|any)\\s+.*(warning|alert|watch|advisory)\\s+(in|for|near)\\s+HD_LOCATION(__\\w+)?.*',
			'HD_LOCATION(__\\w+)?\\s+(weather\\s+)?(alerts?|warnings?|advisories).*',
			'(weather\\s+)?(alerts?|warnings?)\\s+(near|around)\\s+me.*',
			// our additions
			'(blizzard|ice\\s+storm|extreme\\s+heat|red\\s+flag|tropical\\s+storm|storm\\s+surge|dust\\s+storm|freeze|frost|high\\s+wind|thunderstorm)\\s+(alerts?|warnings?|watch(es)?|advisor(y|ies))\\s+(in|for|near|at)\\s+HD_LOCATION(__\\w+)?.*',
			'any\\s+(weather\\s+)?(alerts?|warnings?)\\s+(in|for|near)\\s+HD_LOCATION(__\\w+)?.*',
			'is\\s+there\\s+(a|an|any)\\s+.*(warning|alert|watch|advisory)\\s+(near|around)\\s+me.*'
		]
		// in the future, we can add other types of query formats
	},
	client: {
		// location of client side code
		// should point to pkg.umd - but currently that points to dist/index.umd.js
		location: pkg.module,
		// name of the UMD module
		moduleName: pkg.umdName || 'HD' + pkg.name,
		// baseURL is only used in local testing and ignored after publish
		// Optional: defaults to '/name' (the name of the component)
		baseURL: '/' + pkg.name,

	},
	format: {
		mainline: true,
		sidebar: true
		// "sidebar" / "mainline" / "ribbon" / "fullscreen"
	},
	permissions: {

	},
	info: {
		// key-values added here will be added to the compInfo section of searchData
	},
	// Fill both in before publishing (validated by scripts/validate-publish.js)
	github: "https://github.com/NJ018/Hyperdart_Hackathon",
	demovideo: ""
}
