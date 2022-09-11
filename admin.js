

/**
 * Wait for Jetpack to load stats into the page.
 */
function waitFor( el ) {
	return new Promise( resolve => {
		if ( document.querySelector( el ) ) {
			return resolve( document.querySelector( el ) );
		}

		const ob = new MutationObserver( mutations => {
			if ( document.querySelector( el ) ) {
				resolve( document.querySelector( el ) );
				ob.disconnect();
			}
		} );

		ob.observe( document.body, {
			childList: true,
			subtree: true
		} );
	} );
}

waitFor( '.staticmetabox' ).then( ( el ) => {

	let postIDs = [],
	    rows    = el.querySelectorAll( 'table.statsDay > tbody > tr:not(.h)' );


	/**
	 * Set aside two rows that we won't filter but need to handle separately.
	 */
	let rowPostview = [ ...rows ].filter( row => row.matches( '.postview' ) )[ 0 ],
	    rowTable    = [ ...rows ].filter( row => row.matches( '.table' ) )[ 0 ];

	rows = [ ...rows ].filter( row => row.matches( ':not(.postview):not(.table)' ) );


	/**
	 * Collect post IDs from each row's single-post stats URL.
	 */
	rows.forEach( row => {
		const statsLink = row.querySelector( '.more > a' );

		if ( statsLink ) {
			const params    = new URLSearchParams( statsLink.href.split( '?' )[ 1 ] );
			const postID    = params.get( 'post' );

			postIDs.push( postID );
		}
	} );


	/**
	 * Place the filter selects.
	 */
	document.querySelector( '.staticmetabox table' ).insertAdjacentHTML( 'beforebegin',
		'<p class="jetpack-site-stats-filter jssf-busy">'
			+ '<select class="category"><option class="all" value="all">All categories</option></select>'
			+ '<select class="tag"><option class="all" value="all">All tags</option></select>'
			+ '<select class="author"><option class="all" value="all">All authors</option></select>'
			+ '<input class="button reset" type="button" value="Reset" />'
		+ '</p>'
	);

	let jetpackSiteStatsFilter = document.querySelector( '.jetpack-site-stats-filter' );

	let selectCategory = jetpackSiteStatsFilter.querySelector( '.category' ),
	    selectTag      = jetpackSiteStatsFilter.querySelector( '.tag' ),
	    selectAuthor   = jetpackSiteStatsFilter.querySelector( '.author' );


	/**
	 * Attach metadata as classes to their corresponding rows of posts,
	 * append options to the select elements using display names and their slugs,
	 * and filter rows and options on update.
	 */
	function initFilter( postsMeta ) {

		let categories = [],
		    tags       = [],
		    authors    = [];

		rows.forEach( ( thisRow, i ) => {
			const postID = postIDs[ i ];

			if ( typeof postsMeta[ postID ] === 'undefined' ) {
				return true;
			}

			postsMeta[ postID ].categories.forEach( category => {
				categories[ category.slug ] = category.name;
				thisRow.classList.add( category.slug );
			} );

			postsMeta[ postID ].tags.forEach( tag => {
				tags[ tag.slug ] = tag.name;
				thisRow.classList.add( tag.slug );
			} );

			postsMeta[ postID ].authors.forEach( author => {
				authors[ author.slug ] = author.name;
				thisRow.classList.add( author.slug );
			} );

			thisRow.classList.add( 'jssf-filter-row', 'selected' );  // to aid with showing/hiding

		} );


		/**
		 * Populate the selects with options containing sorted metadata.
		 */
		const optionsHtml = ( metaData, filteredSlugs = null ) => {
			let html  = '';

			const slugs = filteredSlugs ? filteredSlugs.sort() : Object.keys( metaData ).sort();

			slugs.forEach( slug => {
				if ( metaData[ slug ] ) {
					html += `<option value="${ slug }">${ metaData[ slug ] }</option>`;
				}
			} );

			return html;
		}

		selectCategory.insertAdjacentHTML( 'beforeend', optionsHtml( categories ) );
		selectTag.insertAdjacentHTML(      'beforeend', optionsHtml( tags ) );
		selectAuthor.insertAdjacentHTML(   'beforeend', optionsHtml( authors ) );


		/**
		 * Filter rows of top posts/pages on change of the select.
		 */
		let postRowsContainer = rowTable.parentNode;

		function filterPostsAndSelectors() {

			// Hide all while working.
			postRowsContainer.classList.add( 'jssf-filtering' );

			rowTable.style.display    = 'none';
			rowPostview.style.display = 'none';

			// Reset the "+/-" twistie on the "Home page / Archives" row.
			rowPostview.classList.remove( 'peekaboo' );

			let rowsToShow = rows;

			// Clear out any prior selections.
			rowsToShow.forEach( row => row.classList.remove( 'selected' ) );

			// Remove any rows not matching the filter selections.
			if ( selectCategory.value !== 'all' ) {
				rowsToShow = [ ...rowsToShow ].filter( row => row.matches( `.${ selectCategory.value }` ) );
			}
			if ( selectTag.value !== 'all' ) {
				rowsToShow = [ ...rowsToShow ].filter( row => row.matches( `.${ selectTag.value }` ) );
			}
			if ( selectAuthor.value !== 'all' ) {
				rowsToShow = [ ...rowsToShow ].filter( row => row.matches( `.${ selectAuthor.value }` ) );
			}

			// Restore the "Home page / Archives" row if showing all.
			if ( selectCategory.value === 'all' && selectTag.value === 'all' && selectAuthor.value === 'all' ) {
				rowPostview.style.display = 'table-row';
			}

			// Mark remaining rows as having been selected.
			rowsToShow.forEach( row => row.classList.add( 'selected' ) );

			// Unveil.
			postRowsContainer.classList.remove( 'jssf-filtering' );


			/**
			 * And filter the selects.
			 */

			// Collect all unique class names attached to presently visible rows.
			let classesVisibleRows = [];

			rowsToShow.forEach( row => {
				const thisRowClasses = row.classList;

				thisRowClasses.forEach( thisRowClass => classesVisibleRows[ thisRowClass ] = 1 );
			} );

			// Grab the user's current selections and remove all options.
			const selectedCategory = selectCategory.value,
			      selectedTag      = selectTag.value,
			      selectedAuthor   = selectAuthor.value;

			jetpackSiteStatsFilter.querySelectorAll( 'option:not([value="all"])' ).forEach( option => {
				option.remove();
			} );

			// Repopulate with options having any corresponding visible rows.
			selectCategory.insertAdjacentHTML( 'beforeend', optionsHtml( categories, Object.keys( classesVisibleRows ) ) );
			selectTag.insertAdjacentHTML(      'beforeend', optionsHtml( tags,       Object.keys( classesVisibleRows ) ) );
			selectAuthor.insertAdjacentHTML(   'beforeend', optionsHtml( authors,    Object.keys( classesVisibleRows ) ) );

			// And set back to the user's selections.
			selectCategory.value = selectedCategory;
			selectTag.value      = selectedTag;
			selectAuthor.value   = selectedAuthor;
		}

		[ selectCategory, selectTag, selectAuthor ].forEach( select => {
			select.addEventListener( 'change', () => filterPostsAndSelectors() );
		} );


		/**
		 * Reset all selects upon request.
		 */
		jetpackSiteStatsFilter.querySelector( '.reset' ).addEventListener( 'click', () => {
			selectCategory.value = 'all';
			selectTag.value = 'all';
			selectAuthor.value = 'all';

			selectCategory.dispatchEvent( new Event( 'change' ) );
		} );


		/**
		 * Filter is loaded and ready.
		 */
		jetpackSiteStatsFilter.classList.remove( 'jssf-busy' );
	}


	/**
	 * Fetch metadata for the posts given by Jetpack, and initialize the filter.
	 */
	( async () => {

		try {
			let response = await fetch( `${ filterForJetpackSiteStatsApiUrl }?p[]=${ postIDs.join( '&p[]=' ) }` );

			if ( response.status === 200 ) {
				let postsMeta = await response.json();
				initFilter( postsMeta );

			} else {
				throw new Error( response.status );
			}

		} catch( error ) {
			document.querySelector( '#jp-stats-wrap .header' ).insertAdjacentHTML( 'afterbegin',
				`<div class="error"><p>Could not initialize Filter for Jetpack Site Stats:<br />${ error }</p></div>`
			);

		}
	} )();
} );


