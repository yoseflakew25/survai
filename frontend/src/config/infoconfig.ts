import type { InfobarContent } from '@/components/ui/infobar';

export const billingInfoContent: InfobarContent = {
  title: 'Billing & Plans',
  sections: [
    {
      title: 'Overview',
      description:
        "The Billing page allows you to manage your organization's subscription and usage limits. View available plans and upgrade as needed.",
      links: []
    },
    {
      title: 'Available Plans',
      description:
        'View and subscribe to available plans. Plans are displayed as cards with pricing and feature details. Common plans include free, pro, and enterprise tiers.',
      links: []
    },
    {
      title: 'Plan Features',
      description:
        'Each plan can include specific features that unlock functionality in the application. Features are tied to plans and control access to premium capabilities.',
      links: []
    },
    {
      title: 'Access Control',
      description:
        'Plans and features are used for access control throughout the application. Connect a real authentication provider with subscription management to enable plan-based gating.',
      links: []
    }
  ]
};

export const productInfoContent: InfobarContent = {
  title: 'Product Management',
  sections: [
    {
      title: 'Overview',
      description:
        'The Products page allows you to manage your product catalog. You can view all products in a table format with server-side functionality including sorting, filtering, pagination, and search capabilities. Use the "Add New" button to create new products.',
      links: []
    },
    {
      title: 'Adding Products',
      description:
        'To add a new product, click the "Add New" button in the page header. You will be taken to a form where you can enter product details including name, description, price, category, and upload product images.',
      links: []
    },
    {
      title: 'Editing Products',
      description:
        'You can edit existing products by clicking on a product row in the table. This will open the product edit form where you can modify any product information. Changes are saved automatically when you submit the form.',
      links: []
    },
    {
      title: 'Deleting Products',
      description:
        'Products can be deleted from the product listing table. Click the delete action for the product you want to remove. You will be asked to confirm the deletion before the product is permanently removed from your catalog.',
      links: []
    },
    {
      title: 'Table Features',
      description:
        'The product table includes several powerful features to help you manage large product catalogs efficiently. You can sort columns by clicking on column headers, filter products using the filter controls, navigate through pages using pagination, and quickly find products using the search functionality.',
      links: []
    },
    {
      title: 'Product Fields',
      description:
        'Each product can have the following fields: Name (required), Description (optional text), Price (numeric value), Category (for organizing products), and Image Upload (for product photos). All fields can be edited when creating or updating a product.',
      links: []
    }
  ]
};
