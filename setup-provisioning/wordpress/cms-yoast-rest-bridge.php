<?php
/**
 * Plugin Name: CMS Yoast REST Bridge
 * Description: Exposes the Yoast focus keyphrase and raw SEO fields to the CMS importer.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function cms_yoast_rest_value($object) {
    $post_id = absint($object['id'] ?? 0);

    if (!$post_id) {
        return array(
            'focusKeyphrase' => null,
            'seoTitle' => null,
            'metaDescription' => null,
        );
    }

    $read_meta = static function ($key) use ($post_id) {
        $value = get_post_meta($post_id, $key, true);
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    };

    return array(
        'focusKeyphrase' => $read_meta('_yoast_wpseo_focuskw'),
        'seoTitle' => $read_meta('_yoast_wpseo_title'),
        'metaDescription' => $read_meta('_yoast_wpseo_metadesc'),
    );
}

function cms_yoast_register_rest_fields() {
    foreach (array('post', 'page') as $post_type) {
        register_rest_field(
            $post_type,
            'cms_yoast',
            array(
                'get_callback' => 'cms_yoast_rest_value',
                'schema' => array(
                    'description' => 'Raw Yoast SEO values used by the CMS importer.',
                    'type' => 'object',
                    'context' => array('view'),
                    'properties' => array(
                        'focusKeyphrase' => array('type' => array('string', 'null')),
                        'seoTitle' => array('type' => array('string', 'null')),
                        'metaDescription' => array('type' => array('string', 'null')),
                    ),
                ),
            )
        );
    }
}

add_action('rest_api_init', 'cms_yoast_register_rest_fields');
