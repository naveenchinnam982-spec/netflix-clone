// ============================
// Comment Section Component
// ============================
// Interactive comment section with likes, replies, pinned comments, and emoji support.

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, Pin, Smile } from 'lucide-react';
import { cn, formatRelativeDate } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { Comment, CommentSectionProps } from '@/types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const EMOJI_PICKER_DATA = data;

export function CommentSection({ videoId: _videoId, comments, onAddComment, onDeleteComment, onReportComment }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('popular');
  const { user, isAuthenticated } = useAuth();

  const sortedComments = [...comments].sort((a, b) => {
    if (a.status === 'pinned') return -1;
    if (b.status === 'pinned') return 1;
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'popular':
        return (b.likes - b.dislikes) - (a.likes - a.dislikes);
      default:
        return 0;
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment('');
  };

  const handleSubmitReply = (_parentId: string) => {
    if (!replyText.trim()) return;
    onAddComment(replyText.trim());
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white text-lg font-semibold">
          Comments ({comments.length})
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-netflix-dark text-white text-sm border border-white/20 rounded px-3 py-1.5 outline-none focus:border-white/40"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Add Comment */}
      {isAuthenticated && user ? (
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-netflix-red overflow-hidden">
              {user.photoURL ? (
                <Image src={user.photoURL} alt={user.displayName} width={40} height={40} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                  {user.displayName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-transparent text-white border-b border-white/20 pb-2 outline-none focus:border-white/50 transition-colors placeholder:text-netflix-gray"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <div className="absolute right-0 top-0 flex items-center gap-1">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1.5 text-netflix-gray hover:text-white transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <Picker
                        data={EMOJI_PICKER_DATA}
                        onEmojiSelect={(emoji: any) => {
                          setNewComment(prev => prev + emoji.native);
                          setShowEmojiPicker(false);
                        }}
                        theme="dark"
                        previewPosition="none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {newComment && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setNewComment('')}
                  className="text-sm text-netflix-gray hover:text-white transition-colors px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitComment}
                  className="text-sm bg-netflix-red text-white px-4 py-1.5 rounded hover:bg-red-700 transition-colors"
                >
                  Comment
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-netflix-dark/50 backdrop-blur-sm rounded-lg p-6 text-center">
          <p className="text-netflix-gray text-sm">
            <button onClick={() => window.location.href = '/login'} className="text-white hover:underline">
              Sign in
            </button>{' '}
            to add a comment
          </p>
        </div>
      )}

      {/* Comments List */}
      <AnimatePresence>
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={user?.uid}
            onDelete={onDeleteComment}
            onReport={onReportComment}
            onReply={(id) => setReplyingTo(id === replyingTo ? null : id)}
            isReplying={replyingTo === comment.id}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSubmitReply={() => handleSubmitReply(comment.id)}
          />
        ))}
      </AnimatePresence>

      {comments.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 text-netflix-gray mx-auto mb-3" />
          <p className="text-netflix-gray text-sm">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
}

// Comment Item Component
function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onReport,
  onReply,
  isReplying,
  replyText,
  onReplyTextChange,
  onSubmitReply,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  onReply: (id: string) => void;
  isReplying: boolean;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3',
        comment.status === 'pinned' && 'bg-yellow-500/5 rounded-lg p-3'
      )}
    >
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-netflix-dark overflow-hidden">
          {comment.user?.photoURL ? (
            <Image src={comment.user.photoURL} alt={comment.user.displayName} width={40} height={40} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-netflix-gray text-sm">
              {comment.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-sm font-medium">{comment.user?.displayName || 'User'}</span>
          <span className="text-netflix-gray text-xs">{formatRelativeDate(comment.createdAt)}</span>
          {comment.status === 'pinned' && (
            <span className="flex items-center gap-1 text-yellow-500 text-xs">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
        </div>

        <p className="text-white/90 text-sm">{comment.text}</p>

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => setLiked(!liked)}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              liked ? 'text-netflix-red' : 'text-netflix-gray hover:text-white'
            )}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            {comment.likes > 0 && comment.likes}
          </button>
          <button
            onClick={() => setDisliked(!disliked)}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              disliked ? 'text-netflix-red' : 'text-netflix-gray hover:text-white'
            )}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReply(comment.id)}
            className="text-netflix-gray text-xs hover:text-white transition-colors"
          >
            Reply
          </button>
          {currentUserId === comment.userId && onDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-netflix-gray text-xs hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
          {onReport && (
            <button
              onClick={() => onReport(comment.id)}
              className="text-netflix-gray text-xs hover:text-yellow-500 transition-colors"
            >
              Report
            </button>
          )}
        </div>

        {/* Reply Input */}
        {isReplying && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 bg-netflix-dark text-white text-sm border border-white/20 rounded px-3 py-1.5 outline-none focus:border-white/40"
              onKeyDown={(e) => e.key === 'Enter' && onSubmitReply()}
              autoFocus
            />
            <button
              onClick={onSubmitReply}
              className="text-sm bg-netflix-red text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
