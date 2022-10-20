<?php
/**
 * Plugin Name: Filter for Jetpack Site Stats
 * Description: Enables admins to filter "Top Posts & Pages" summaries by metadata.
 * Version: 1.0.2
 * Requires PHP: 7.4
 * Author: Chris Colwell
 * Author URI: https://jchriscolwell.com/
 * License: GPLv2 or later
 */


namespace FilterForJetpackSiteStats;


/**
 * Insert admin script and style.
 */
function admin_script_and_style( $hook ) {
	if ( ! (
		$hook === 'jetpack_page_stats'
		&& isset( $_GET[ 'view' ] )
		&& $_GET[ 'view' ] === 'postviews'
	) ) {
		return;
	}

	$path = plugin_dir_path( __FILE__ );
	$url  = plugin_dir_url( __FILE__ );
	$slug = basename( __FILE__, '.php' );

	$style_file_date = filemtime( $path . 'admin.css' );
	wp_register_style( $slug, $url . 'admin.css', false, $style_file_date );
	wp_enqueue_style( $slug );

	$script_file_date = filemtime( $path . 'admin.js' );
	wp_register_script( $slug, $url . 'admin.js', array( 'jquery' ), $script_file_date, true );
	wp_enqueue_script( $slug );

	wp_localize_script( $slug, 'filterForJetpackSiteStatsApiUrl', get_rest_url( null, $slug . '/v1/get/' ) );
}
add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\admin_script_and_style' );


/**
 * Return category, tag and author for the given array of post IDs.
 */
function metadata_for_posts( $data ) {
	$post_ids = $data->get_param( 'p' );
	$posts    = [];

	foreach( $post_ids as $i => $post_id ) {
		$post_id = ( int ) $post_id;


		$posts[ $post_id ][ 'categories' ] = array_map(
			fn( $obj ) => [
				'slug' => 'category-' . $obj->slug,
				'name' => $obj->name
			],
			wp_get_post_categories( $post_id, [ 'fields' => 'all' ] )
		);


		$posts[ $post_id ][ 'tags' ] = array_map(
			fn( $obj ) => [
				'slug' => 'tag-' . $obj->slug,
				'name' => $obj->name
			],
			wp_get_post_tags( $post_id, [ 'fields' => 'all' ] )
		);


		$author_id    = get_post_field( 'post_author', $post_id );
		$display_name = get_the_author_meta( 'display_name', $author_id );

		$last_name = get_the_author_meta( 'last_name', $author_id );
		$last_name = iconv( 'UTF-8', 'ASCII//TRANSLIT//IGNORE', $last_name );
		$last_name = preg_replace( '/[^a-zA-Z]/', '', $last_name );

		$posts[ $post_id ][ 'authors' ] = [ [
			'slug' => 'author-' . $last_name . '-' . $author_id,
			'name' => $display_name
		] ];

	}

	return $posts;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'filter-for-jetpack-site-stats/v1', '/get/', array( 
		'methods'  => 'GET',
		'callback' => __NAMESPACE__ . '\metadata_for_posts'
	 ) );
} );

