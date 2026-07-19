"use client";

import { supabase } from "../lib/supabaseClient";
import { sanitizeHtml } from "../lib/sanitizeHtml";

export default function PostsList({ posts, currentUserId, onDeleted }) {
  async function handleDelete(postId) {
    const confirmed = window.confirm("Удалить этот пост?");
    if (!confirmed) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      onDeleted?.(postId);
    }
  }

  if (posts.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-muted">Постов пока нет</p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {posts.map((post) => (
        <div key={post.id} className="rounded-lg border border-paper/10 bg-panel p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-sakura">
                {post.avatar_url ? (
                  <img src={post.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  post.username?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-paper">{post.username}</p>
                <p className="text-xs text-muted">
                  {new Date(post.created_at).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>

            {post.user_id === currentUserId && (
              <button
                onClick={() => handleDelete(post.id)}
                className="text-xs text-muted hover:text-sakura"
              >
                Удалить
              </button>
            )}
          </div>

          {post.content_html && (
            <div
              className="mt-3 whitespace-pre-wrap text-sm text-paper"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content_html) }}
            />
          )}

          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="mt-3 max-h-96 w-full rounded-lg object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
